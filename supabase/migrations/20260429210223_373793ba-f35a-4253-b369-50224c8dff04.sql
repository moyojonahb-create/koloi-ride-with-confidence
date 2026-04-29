-- 1. WITHDRAWALS TABLE
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  method text NOT NULL CHECK (method IN ('ecocash','bank','innbucks')),
  destination text NOT NULL,
  account_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX idx_withdrawals_driver ON public.withdrawals(driver_id, created_at DESC);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers can view their own withdrawals" ON public.withdrawals
  FOR SELECT USING (driver_id = auth.uid());
CREATE POLICY "Drivers can insert their own withdrawals" ON public.withdrawals
  FOR INSERT WITH CHECK (driver_id = auth.uid());
CREATE POLICY "Admins can manage all withdrawals" ON public.withdrawals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. WALLET TRANSFERS TABLE
CREATE TABLE public.wallet_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  note text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','flagged','reversed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_transfers_sender ON public.wallet_transfers(sender_id, created_at DESC);
CREATE INDEX idx_wallet_transfers_receiver ON public.wallet_transfers(receiver_id, created_at DESC);
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transfers" ON public.wallet_transfers
  FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));
CREATE POLICY "Admins can manage all transfers" ON public.wallet_transfers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. RIDES: wallet payment columns
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS wallet_paid boolean NOT NULL DEFAULT false;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS wallet_paid_at timestamptz;

-- 4. TRANSFER_FUNDS RPC
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_receiver_id uuid,
  p_amount numeric,
  p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_sender_balance numeric;
  v_daily_total numeric;
  v_is_driver_sender boolean;
  v_is_driver_receiver boolean;
BEGIN
  IF v_sender IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not authenticated');
  END IF;
  IF v_sender = p_receiver_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Cannot transfer to yourself');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Amount must be greater than zero');
  END IF;
  IF p_amount > 500 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Maximum $500 per transfer');
  END IF;

  -- Daily cap $1000
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_daily_total
  FROM wallet_transfers
  WHERE sender_id = v_sender AND created_at >= date_trunc('day', now());
  IF v_daily_total + p_amount > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Daily transfer limit ($1000) reached');
  END IF;

  -- Determine sender wallet (driver vs rider)
  SELECT EXISTS(SELECT 1 FROM driver_wallets WHERE driver_id = v_sender) INTO v_is_driver_sender;
  SELECT EXISTS(SELECT 1 FROM driver_wallets WHERE driver_id = p_receiver_id) INTO v_is_driver_receiver;

  -- Debit sender
  IF v_is_driver_sender THEN
    SELECT balance_usd INTO v_sender_balance FROM driver_wallets WHERE driver_id = v_sender FOR UPDATE;
    IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient balance');
    END IF;
    UPDATE driver_wallets SET balance_usd = balance_usd - p_amount, updated_at = now()
      WHERE driver_id = v_sender;
  ELSE
    SELECT balance INTO v_sender_balance FROM wallets WHERE user_id = v_sender FOR UPDATE;
    IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient balance');
    END IF;
    UPDATE wallets SET balance = balance - p_amount, updated_at = now()
      WHERE user_id = v_sender;
    INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description)
      SELECT id, v_sender, -p_amount, 'transfer_out', COALESCE(p_note, 'Transfer to user')
      FROM wallets WHERE user_id = v_sender;
  END IF;

  -- Credit receiver
  IF v_is_driver_receiver THEN
    INSERT INTO driver_wallets (driver_id, balance_usd) VALUES (p_receiver_id, p_amount)
      ON CONFLICT (driver_id) DO UPDATE
      SET balance_usd = driver_wallets.balance_usd + EXCLUDED.balance_usd, updated_at = now();
  ELSE
    INSERT INTO wallets (user_id, balance) VALUES (p_receiver_id, p_amount)
      ON CONFLICT (user_id) DO UPDATE
      SET balance = wallets.balance + EXCLUDED.balance, updated_at = now();
    INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description)
      SELECT id, p_receiver_id, p_amount, 'transfer_in', COALESCE(p_note, 'Transfer received')
      FROM wallets WHERE user_id = p_receiver_id;
  END IF;

  -- Log transfer
  INSERT INTO wallet_transfers (sender_id, receiver_id, amount_usd, note)
    VALUES (v_sender, p_receiver_id, p_amount, p_note);

  RETURN jsonb_build_object('ok', true, 'amount', p_amount);
END;
$$;

-- 5. PAY_RIDE_FROM_WALLET RPC
CREATE OR REPLACE FUNCTION public.pay_ride_from_wallet(p_ride_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ride rides%ROWTYPE;
  v_user uuid := auth.uid();
  v_balance numeric;
  v_wallet_id uuid;
BEGIN
  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'Ride not found'); END IF;
  IF v_ride.user_id != v_user THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not authorized');
  END IF;
  IF v_ride.wallet_paid THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true);
  END IF;
  IF v_ride.status NOT IN ('accepted','in_progress','arrived','completed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Ride not in payable state');
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance FROM wallets WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_ride.fare THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient wallet balance');
  END IF;

  UPDATE wallets SET balance = balance - v_ride.fare, updated_at = now() WHERE id = v_wallet_id;
  INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description, ride_id)
    VALUES (v_wallet_id, v_user, -v_ride.fare, 'ride_payment', 'Ride payment: ' || v_ride.pickup_address || ' → ' || v_ride.dropoff_address, p_ride_id);

  UPDATE rides SET wallet_paid = true, wallet_paid_at = now(), updated_at = now() WHERE id = p_ride_id;

  RETURN jsonb_build_object('ok', true, 'amount', v_ride.fare);
END;
$$;

-- 6. REQUEST_WITHDRAWAL RPC
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount numeric, p_method text, p_destination text, p_account_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_driver uuid := auth.uid();
  v_balance numeric;
  v_id uuid;
BEGIN
  IF v_driver IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not authenticated');
  END IF;
  IF p_amount IS NULL OR p_amount < 5 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Minimum withdrawal is $5');
  END IF;
  IF p_method NOT IN ('ecocash','bank','innbucks') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Invalid method');
  END IF;
  IF p_destination IS NULL OR length(trim(p_destination)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Destination required');
  END IF;

  SELECT balance_usd INTO v_balance FROM driver_wallets WHERE driver_id = v_driver FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient balance');
  END IF;

  UPDATE driver_wallets SET balance_usd = balance_usd - p_amount, updated_at = now()
    WHERE driver_id = v_driver;

  INSERT INTO withdrawals (driver_id, amount_usd, method, destination, account_name)
    VALUES (v_driver, p_amount, p_method, p_destination, p_account_name)
    RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- 7. ADMIN APPROVE WITHDRAWAL
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_id uuid, p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not admin');
  END IF;
  UPDATE withdrawals
    SET status = 'approved', approved_by = auth.uid(), approved_at = now(), admin_note = p_note
    WHERE id = p_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not found or already processed');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 8. ADMIN REJECT WITHDRAWAL (refunds wallet)
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_id uuid, p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_w withdrawals%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not admin');
  END IF;
  SELECT * INTO v_w FROM withdrawals WHERE id = p_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not found or already processed');
  END IF;

  -- Refund driver wallet
  UPDATE driver_wallets SET balance_usd = balance_usd + v_w.amount_usd, updated_at = now()
    WHERE driver_id = v_w.driver_id;

  UPDATE withdrawals
    SET status = 'rejected', approved_by = auth.uid(), approved_at = now(), admin_note = p_note
    WHERE id = p_id;

  RETURN jsonb_build_object('ok', true, 'refunded', v_w.amount_usd);
END;
$$;

-- 9. UPDATE complete_trip_with_commission to auto-pay from rider wallet
CREATE OR REPLACE FUNCTION public.complete_trip_with_commission(p_trip_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ride rides%ROWTYPE;
  v_driver_user_id uuid;
  v_driver_id uuid;
  v_fare numeric;
  v_commission numeric;
  v_driver_earnings numeric;
  v_wallet driver_wallets%ROWTYPE;
  v_rider_wallet wallets%ROWTYPE;
  v_auto_paid boolean := false;
BEGIN
  SELECT * INTO v_ride FROM rides WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'Ride not found'); END IF;

  SELECT id, user_id INTO v_driver_id, v_driver_user_id FROM drivers WHERE id = v_ride.driver_id;
  IF v_driver_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'No driver assigned');
  END IF;

  IF auth.uid() != v_driver_user_id AND auth.uid() != v_ride.user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not authorized');
  END IF;

  v_fare := v_ride.fare;
  v_commission := ROUND(v_fare * 0.15, 2);
  v_driver_earnings := v_fare - v_commission;

  -- AUTO WALLET DEDUCT if payment_method='wallet' and not yet paid
  IF v_ride.payment_method = 'wallet' AND NOT v_ride.wallet_paid THEN
    SELECT * INTO v_rider_wallet FROM wallets WHERE user_id = v_ride.user_id FOR UPDATE;
    IF v_rider_wallet.id IS NULL OR v_rider_wallet.balance < v_fare THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Rider wallet has insufficient balance');
    END IF;
    UPDATE wallets SET balance = balance - v_fare, updated_at = now() WHERE id = v_rider_wallet.id;
    INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description, ride_id)
      VALUES (v_rider_wallet.id, v_ride.user_id, -v_fare, 'ride_payment',
              'Ride payment (auto): ' || v_ride.pickup_address || ' → ' || v_ride.dropoff_address, p_trip_id);
    UPDATE rides SET wallet_paid = true, wallet_paid_at = now() WHERE id = p_trip_id;
    v_auto_paid := true;
  END IF;

  -- Driver wallet flow
  SELECT * INTO v_wallet FROM driver_wallets WHERE driver_id = v_driver_user_id FOR UPDATE;

  IF v_ride.payment_method = 'wallet' THEN
    -- Credit driver with net earnings (commission goes straight to platform)
    INSERT INTO driver_wallets (driver_id, balance_usd) VALUES (v_driver_user_id, v_driver_earnings)
      ON CONFLICT (driver_id) DO UPDATE
      SET balance_usd = driver_wallets.balance_usd + EXCLUDED.balance_usd, updated_at = now();
  ELSE
    -- Cash flow: driver collected cash; deduct commission from wallet
    IF v_wallet.id IS NULL OR v_wallet.balance_usd < v_commission THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient wallet balance for commission');
    END IF;
    UPDATE driver_wallets SET balance_usd = balance_usd - v_commission, updated_at = now()
      WHERE driver_id = v_driver_user_id;
  END IF;

  INSERT INTO admin_earnings (ride_id, driver_id, fare_amount, platform_fee, driver_earnings)
    VALUES (p_trip_id, v_driver_user_id, v_fare, v_commission, v_driver_earnings);

  UPDATE rides SET status = 'completed', updated_at = now() WHERE id = p_trip_id;

  UPDATE drivers SET total_trips = COALESCE(total_trips, 0) + 1, updated_at = now()
    WHERE id = v_driver_id;

  RETURN jsonb_build_object(
    'ok', true,
    'fare_usd', v_fare,
    'commission_usd', v_commission,
    'driver_earnings_usd', v_driver_earnings,
    'wallet_auto_paid', v_auto_paid
  );
END;
$$;