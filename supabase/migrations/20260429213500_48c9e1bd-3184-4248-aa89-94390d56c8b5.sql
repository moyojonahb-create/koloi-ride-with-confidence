-- 1) Wallet lock columns
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_reason text,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid;

-- 2) Payment failure tracking on rides
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS payment_failed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_failure_reason text;

-- 3) Reference code on wallet_transactions for audit trail
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS reference_code text;

-- Backfill default reference codes for existing rows (one-time)
UPDATE public.wallet_transactions
  SET reference_code = 'TX-' || substr(replace(id::text, '-', ''), 1, 10)
  WHERE reference_code IS NULL;

-- 4) Atomic wallet ride request: validates balance + lock + creates ride
CREATE OR REPLACE FUNCTION public.request_wallet_ride(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_fare numeric;
  v_balance numeric;
  v_locked boolean;
  v_ride_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not authenticated');
  END IF;

  v_fare := (p_payload->>'fare')::numeric;
  IF v_fare IS NULL OR v_fare <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Invalid fare');
  END IF;

  -- Check wallet exists and not locked
  SELECT balance, COALESCE(is_locked, false) INTO v_balance, v_locked
  FROM wallets WHERE user_id = v_user;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Wallet not found. Please top up first.');
  END IF;

  IF v_locked THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Your wallet is locked. Contact support.');
  END IF;

  IF v_balance < v_fare THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'Wallet balance too low for this ride',
      'balance', v_balance,
      'fare', v_fare
    );
  END IF;

  -- Insert ride forcing wallet payment method and the authenticated user
  INSERT INTO rides (
    user_id, status, pickup_address, dropoff_address,
    pickup_lat, pickup_lon, dropoff_lat, dropoff_lon,
    fare, distance_km, duration_minutes,
    vehicle_type, route_polyline, passenger_count,
    payment_method, town_id, gender_preference,
    passenger_name, passenger_phone, scheduled_at
  )
  VALUES (
    v_user,
    COALESCE(p_payload->>'status', 'pending'),
    p_payload->>'pickup_address',
    p_payload->>'dropoff_address',
    (p_payload->>'pickup_lat')::double precision,
    (p_payload->>'pickup_lon')::double precision,
    (p_payload->>'dropoff_lat')::double precision,
    (p_payload->>'dropoff_lon')::double precision,
    v_fare,
    (p_payload->>'distance_km')::numeric,
    (p_payload->>'duration_minutes')::numeric,
    COALESCE(p_payload->>'vehicle_type', 'economy'),
    NULLIF(p_payload->>'route_polyline', ''),
    COALESCE((p_payload->>'passenger_count')::int, 1),
    'wallet',
    NULLIF(p_payload->>'town_id', ''),
    COALESCE(p_payload->>'gender_preference', 'any'),
    NULLIF(p_payload->>'passenger_name', ''),
    NULLIF(p_payload->>'passenger_phone', ''),
    NULLIF(p_payload->>'scheduled_at', '')::timestamptz
  )
  RETURNING id INTO v_ride_id;

  RETURN jsonb_build_object('ok', true, 'ride_id', v_ride_id);
END;
$$;

-- 5) Update pay_ride_from_wallet: respect wallet lock + add reference_code
CREATE OR REPLACE FUNCTION public.pay_ride_from_wallet(p_ride_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride rides%ROWTYPE;
  v_user uuid := auth.uid();
  v_balance numeric;
  v_wallet_id uuid;
  v_locked boolean;
  v_driver_user_id uuid;
  v_driver_id uuid;
  v_commission numeric;
  v_driver_earnings numeric;
  v_ref text;
BEGIN
  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Ride not found');
  END IF;

  IF v_ride.user_id != v_user THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not authorized');
  END IF;

  IF v_ride.wallet_paid THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true);
  END IF;

  IF v_ride.status NOT IN ('accepted','in_progress','arrived','completed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Ride not in payable state');
  END IF;

  SELECT id, user_id INTO v_driver_id, v_driver_user_id
    FROM drivers WHERE id = v_ride.driver_id;
  IF v_driver_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'No driver assigned');
  END IF;

  SELECT id, balance, COALESCE(is_locked, false) INTO v_wallet_id, v_balance, v_locked
    FROM wallets WHERE user_id = v_user FOR UPDATE;
  IF v_locked THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Wallet is locked');
  END IF;
  IF v_balance IS NULL OR v_balance < v_ride.fare THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient wallet balance');
  END IF;

  v_commission := ROUND(v_ride.fare * 0.15, 2);
  v_driver_earnings := v_ride.fare - v_commission;
  v_ref := 'PAY-' || substr(replace(p_ride_id::text, '-', ''), 1, 10);

  UPDATE wallets SET balance = balance - v_ride.fare, updated_at = now()
    WHERE id = v_wallet_id;

  INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description, ride_id, reference_code)
    VALUES (v_wallet_id, v_user, -v_ride.fare, 'ride_payment',
            'Ride payment: ' || v_ride.pickup_address || ' → ' || v_ride.dropoff_address,
            p_ride_id, v_ref);

  INSERT INTO driver_wallets (driver_id, balance_usd)
    VALUES (v_driver_user_id, v_driver_earnings)
    ON CONFLICT (driver_id) DO UPDATE
      SET balance_usd = driver_wallets.balance_usd + EXCLUDED.balance_usd,
          updated_at = now();

  INSERT INTO admin_earnings (ride_id, driver_id, fare_amount, platform_fee, driver_earnings)
    VALUES (p_ride_id, v_driver_user_id, v_ride.fare, v_commission, v_driver_earnings);

  UPDATE rides
    SET wallet_paid = true, wallet_paid_at = now(), updated_at = now()
    WHERE id = p_ride_id;

  RETURN jsonb_build_object('ok', true, 'amount', v_ride.fare, 'reference', v_ref);
END;
$$;

-- 6) Update complete_trip_with_commission: on auto-charge failure mark payment_failed + lock wallet
CREATE OR REPLACE FUNCTION public.complete_trip_with_commission(p_trip_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_already_credited boolean := false;
  v_ref text;
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
  v_ref := 'AUTO-' || substr(replace(p_trip_id::text, '-', ''), 1, 10);

  IF v_ride.payment_method = 'wallet' AND v_ride.wallet_paid THEN
    v_already_credited := true;
  ELSIF v_ride.payment_method = 'wallet' AND NOT v_ride.wallet_paid THEN
    SELECT * INTO v_rider_wallet FROM wallets WHERE user_id = v_ride.user_id FOR UPDATE;
    IF v_rider_wallet.id IS NULL OR v_rider_wallet.balance < v_fare THEN
      -- Mark ride as payment failed and lock the rider's wallet for admin review
      UPDATE rides
        SET payment_failed = true,
            payment_failure_reason = 'Insufficient wallet balance at trip completion',
            updated_at = now()
        WHERE id = p_trip_id;
      IF v_rider_wallet.id IS NOT NULL THEN
        UPDATE wallets
          SET is_locked = true,
              locked_reason = 'Auto-charge failed: insufficient balance at trip end',
              locked_at = now(),
              updated_at = now()
          WHERE id = v_rider_wallet.id;
      END IF;
      INSERT INTO fraud_flags (user_id, flag_type, severity, details)
        VALUES (v_ride.user_id, 'payment_failed', 'high',
          jsonb_build_object('ride_id', p_trip_id, 'fare', v_fare,
            'balance', COALESCE(v_rider_wallet.balance, 0)));
      RETURN jsonb_build_object('ok', false, 'reason', 'Payment failed: insufficient wallet balance. Account flagged.');
    END IF;
    UPDATE wallets SET balance = balance - v_fare, updated_at = now() WHERE id = v_rider_wallet.id;
    INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description, ride_id, reference_code)
      VALUES (v_rider_wallet.id, v_ride.user_id, -v_fare, 'ride_payment',
              'Ride payment (auto): ' || v_ride.pickup_address || ' → ' || v_ride.dropoff_address,
              p_trip_id, v_ref);
    UPDATE rides SET wallet_paid = true, wallet_paid_at = now() WHERE id = p_trip_id;
    v_auto_paid := true;
  END IF;

  SELECT * INTO v_wallet FROM driver_wallets WHERE driver_id = v_driver_user_id FOR UPDATE;

  IF v_ride.payment_method = 'wallet' THEN
    IF NOT v_already_credited THEN
      INSERT INTO driver_wallets (driver_id, balance_usd) VALUES (v_driver_user_id, v_driver_earnings)
        ON CONFLICT (driver_id) DO UPDATE
        SET balance_usd = driver_wallets.balance_usd + EXCLUDED.balance_usd, updated_at = now();
      INSERT INTO admin_earnings (ride_id, driver_id, fare_amount, platform_fee, driver_earnings)
        VALUES (p_trip_id, v_driver_user_id, v_fare, v_commission, v_driver_earnings);
    END IF;
  ELSE
    IF v_wallet.id IS NULL OR v_wallet.balance_usd < v_commission THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient wallet balance for commission');
    END IF;
    UPDATE driver_wallets SET balance_usd = balance_usd - v_commission, updated_at = now()
      WHERE driver_id = v_driver_user_id;
    INSERT INTO admin_earnings (ride_id, driver_id, fare_amount, platform_fee, driver_earnings)
      VALUES (p_trip_id, v_driver_user_id, v_fare, v_commission, v_driver_earnings);
  END IF;

  UPDATE rides SET status = 'completed', updated_at = now() WHERE id = p_trip_id;
  UPDATE drivers SET total_trips = COALESCE(total_trips, 0) + 1, updated_at = now()
    WHERE id = v_driver_id;

  RETURN jsonb_build_object(
    'ok', true,
    'fare_usd', v_fare,
    'commission_usd', v_commission,
    'driver_earnings_usd', v_driver_earnings,
    'wallet_auto_paid', v_auto_paid,
    'already_credited', v_already_credited
  );
END;
$$;

-- 7) Update transfer_funds: also block locked sender wallets
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_receiver_id uuid,
  p_amount numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_sender_balance numeric;
  v_locked boolean;
  v_daily_total numeric;
  v_is_driver_sender boolean;
  v_is_driver_receiver boolean;
  v_dup_count int;
  v_ref text;
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

  SELECT COUNT(*) INTO v_dup_count
  FROM wallet_transfers
  WHERE sender_id = v_sender
    AND receiver_id = p_receiver_id
    AND amount_usd = p_amount
    AND created_at > now() - interval '60 seconds';
  IF v_dup_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Duplicate transfer detected. Please wait 60 seconds.');
  END IF;

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_daily_total
  FROM wallet_transfers
  WHERE sender_id = v_sender AND created_at >= date_trunc('day', now());
  IF v_daily_total + p_amount > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Daily transfer limit ($1000) reached');
  END IF;

  SELECT EXISTS(SELECT 1 FROM driver_wallets WHERE driver_id = v_sender) INTO v_is_driver_sender;
  SELECT EXISTS(SELECT 1 FROM driver_wallets WHERE driver_id = p_receiver_id) INTO v_is_driver_receiver;

  v_ref := 'XFR-' || substr(md5(random()::text || v_sender::text), 1, 10);

  IF v_is_driver_sender THEN
    SELECT balance_usd INTO v_sender_balance FROM driver_wallets WHERE driver_id = v_sender FOR UPDATE;
    IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient balance');
    END IF;
    UPDATE driver_wallets SET balance_usd = balance_usd - p_amount, updated_at = now()
      WHERE driver_id = v_sender;
  ELSE
    SELECT balance, COALESCE(is_locked, false) INTO v_sender_balance, v_locked
      FROM wallets WHERE user_id = v_sender FOR UPDATE;
    IF v_locked THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Your wallet is locked');
    END IF;
    IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient balance');
    END IF;
    UPDATE wallets SET balance = balance - p_amount, updated_at = now()
      WHERE user_id = v_sender;
    INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description, reference_code)
      SELECT id, v_sender, -p_amount, 'transfer_out', COALESCE(p_note, 'Transfer to user'), v_ref
      FROM wallets WHERE user_id = v_sender;
  END IF;

  IF v_is_driver_receiver THEN
    INSERT INTO driver_wallets (driver_id, balance_usd) VALUES (p_receiver_id, p_amount)
      ON CONFLICT (driver_id) DO UPDATE
      SET balance_usd = driver_wallets.balance_usd + EXCLUDED.balance_usd, updated_at = now();
  ELSE
    INSERT INTO wallets (user_id, balance) VALUES (p_receiver_id, p_amount)
      ON CONFLICT (user_id) DO UPDATE
      SET balance = wallets.balance + EXCLUDED.balance, updated_at = now();
    INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description, reference_code)
      SELECT id, p_receiver_id, p_amount, 'transfer_in', COALESCE(p_note, 'Transfer received'), v_ref
      FROM wallets WHERE user_id = p_receiver_id;
  END IF;

  INSERT INTO wallet_transfers (sender_id, receiver_id, amount_usd, note)
    VALUES (v_sender, p_receiver_id, p_amount, p_note);

  RETURN jsonb_build_object('ok', true, 'amount', p_amount, 'reference', v_ref);
END;
$$;

-- 8) Admin: lock / unlock rider wallet
CREATE OR REPLACE FUNCTION public.admin_lock_wallet(p_user_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not admin');
  END IF;
  UPDATE wallets
    SET is_locked = true, locked_reason = p_reason,
        locked_at = now(), locked_by = auth.uid(), updated_at = now()
    WHERE user_id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unlock_wallet(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not admin');
  END IF;
  UPDATE wallets
    SET is_locked = false, locked_reason = NULL,
        locked_at = NULL, locked_by = NULL, updated_at = now()
    WHERE user_id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 9) Admin: reverse a wallet transaction (compensating entry, original kept immutable)
CREATE OR REPLACE FUNCTION public.admin_reverse_transaction(p_tx_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx wallet_transactions%ROWTYPE;
  v_reverse_amount numeric;
  v_ref text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not admin');
  END IF;

  SELECT * INTO v_tx FROM wallet_transactions WHERE id = p_tx_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Transaction not found');
  END IF;

  IF EXISTS(SELECT 1 FROM wallet_transactions
            WHERE description LIKE 'Reversal of ' || p_tx_id::text || '%') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Already reversed');
  END IF;

  v_reverse_amount := -v_tx.amount;
  v_ref := 'REV-' || substr(replace(p_tx_id::text, '-', ''), 1, 10);

  UPDATE wallets SET balance = balance + v_reverse_amount, updated_at = now()
    WHERE id = v_tx.wallet_id;

  INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description, ride_id, reference_code)
    VALUES (v_tx.wallet_id, v_tx.user_id, v_reverse_amount, 'reversal',
            'Reversal of ' || p_tx_id::text || ': ' || COALESCE(p_reason, ''),
            v_tx.ride_id, v_ref);

  RETURN jsonb_build_object('ok', true, 'reversed_amount', v_reverse_amount, 'reference', v_ref);
END;
$$;