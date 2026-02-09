
-- 1) Driver wallets (USD balance)
CREATE TABLE public.driver_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL UNIQUE,
  balance_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own wallet" ON public.driver_wallets
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert their own wallet" ON public.driver_wallets
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins can manage all driver wallets" ON public.driver_wallets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) FX rates table
CREATE TABLE public.fx_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zar_per_usd numeric NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  set_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view fx rates" ON public.fx_rates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage fx rates" ON public.fx_rates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Deposit requests table
CREATE TABLE public.deposit_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  ecocash_phone text NOT NULL,
  ecocash_reference text NOT NULL,
  proof_path text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own deposits" ON public.deposit_requests
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert their own deposits" ON public.deposit_requests
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins can manage all deposits" ON public.deposit_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) RPC: admin_set_fx_rate
CREATE OR REPLACE FUNCTION public.admin_set_fx_rate(p_zar_per_usd numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not admin');
  END IF;

  INSERT INTO fx_rates (zar_per_usd, effective_date, set_by)
  VALUES (p_zar_per_usd, CURRENT_DATE, auth.uid());

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 5) RPC: admin_approve_deposit
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(p_deposit_id uuid, p_note text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dep deposit_requests%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not admin');
  END IF;

  SELECT * INTO v_dep FROM deposit_requests WHERE id = p_deposit_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Deposit not found or already processed');
  END IF;

  -- Credit driver wallet (upsert)
  INSERT INTO driver_wallets (driver_id, balance_usd)
  VALUES (v_dep.driver_id, v_dep.amount_usd)
  ON CONFLICT (driver_id) DO UPDATE
    SET balance_usd = driver_wallets.balance_usd + EXCLUDED.balance_usd,
        updated_at = now();

  -- Mark deposit approved
  UPDATE deposit_requests
  SET status = 'approved', approved_by = auth.uid(), approved_at = now(), admin_note = p_note
  WHERE id = p_deposit_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 6) RPC: complete_trip_and_charge_flat_r4
CREATE OR REPLACE FUNCTION public.complete_trip_and_charge_flat_r4(p_trip_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride rides%ROWTYPE;
  v_driver_user_id uuid;
  v_rate numeric;
  v_fee_usd numeric;
  v_wallet driver_wallets%ROWTYPE;
BEGIN
  -- Get ride
  SELECT * INTO v_ride FROM rides WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Ride not found');
  END IF;

  -- Get driver's user_id
  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = v_ride.driver_id;
  IF v_driver_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'No driver assigned');
  END IF;

  -- Verify caller is the driver
  IF auth.uid() != v_driver_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not authorized');
  END IF;

  -- Get latest FX rate
  SELECT zar_per_usd INTO v_rate
  FROM fx_rates
  ORDER BY effective_date DESC, created_at DESC
  LIMIT 1;

  IF v_rate IS NULL OR v_rate <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'No FX rate set');
  END IF;

  -- Calculate fee: R4 in USD
  v_fee_usd := ROUND(4.0 / v_rate, 2);

  -- Check wallet balance
  SELECT * INTO v_wallet FROM driver_wallets WHERE driver_id = v_driver_user_id;
  IF NOT FOUND OR v_wallet.balance_usd < v_fee_usd THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient wallet balance');
  END IF;

  -- Deduct fee
  UPDATE driver_wallets
  SET balance_usd = balance_usd - v_fee_usd, updated_at = now()
  WHERE driver_id = v_driver_user_id;

  -- Mark ride completed
  UPDATE rides SET status = 'completed', updated_at = now() WHERE id = p_trip_id;

  RETURN jsonb_build_object('ok', true, 'fee_usd', v_fee_usd, 'zar_per_usd', v_rate);
END;
$$;

-- 7) Storage bucket for deposit proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('deposit-proofs', 'deposit-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Drivers can upload their own proofs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Drivers can view their own proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'deposit-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all deposit proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'deposit-proofs' AND has_role(auth.uid(), 'admin'::app_role));
