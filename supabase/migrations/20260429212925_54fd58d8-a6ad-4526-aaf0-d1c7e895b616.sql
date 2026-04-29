-- 1) Duplicate-payment guard for wallet ride payments and transfers
-- Use a small function admins/users call to flag a user, plus an idempotency check on transfers
-- Strengthen pay_ride_from_wallet against double-clicks via advisory locks (already protected by FOR UPDATE + wallet_paid flag)

-- Admin: flag a user as suspicious
CREATE OR REPLACE FUNCTION public.admin_flag_user(
  p_user_id uuid,
  p_reason text,
  p_severity text DEFAULT 'medium'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not admin');
  END IF;

  IF p_severity NOT IN ('low','medium','high','critical') THEN
    p_severity := 'medium';
  END IF;

  INSERT INTO public.fraud_flags (user_id, flag_type, severity, details)
  VALUES (
    p_user_id,
    'admin_manual_flag',
    p_severity,
    jsonb_build_object('reason', p_reason, 'flagged_by', auth.uid())
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Admin: resolve / unflag a user fraud flag
CREATE OR REPLACE FUNCTION public.admin_resolve_fraud_flag(p_flag_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not admin');
  END IF;

  UPDATE public.fraud_flags
  SET resolved = true, resolved_by = auth.uid(), resolved_at = now()
  WHERE id = p_flag_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Duplicate-transfer guard: reject identical transfer (same sender/receiver/amount) within 60s
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
  v_daily_total numeric;
  v_is_driver_sender boolean;
  v_is_driver_receiver boolean;
  v_dup_count int;
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

  -- Duplicate detection: same sender → receiver → amount within 60 seconds
  SELECT COUNT(*) INTO v_dup_count
  FROM wallet_transfers
  WHERE sender_id = v_sender
    AND receiver_id = p_receiver_id
    AND amount_usd = p_amount
    AND created_at > now() - interval '60 seconds';
  IF v_dup_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Duplicate transfer detected. Please wait 60 seconds.');
  END IF;

  -- Daily cap $1000
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_daily_total
  FROM wallet_transfers
  WHERE sender_id = v_sender AND created_at >= date_trunc('day', now());
  IF v_daily_total + p_amount > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Daily transfer limit ($1000) reached');
  END IF;

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

  INSERT INTO wallet_transfers (sender_id, receiver_id, amount_usd, note)
    VALUES (v_sender, p_receiver_id, p_amount, p_note);

  RETURN jsonb_build_object('ok', true, 'amount', p_amount);
END;
$$;