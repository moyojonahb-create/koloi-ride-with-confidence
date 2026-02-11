
-- Add trial_ends_at to drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Set default 7-day trial for existing drivers without a trial
UPDATE public.drivers SET trial_ends_at = created_at + INTERVAL '7 days' WHERE trial_ends_at IS NULL;

-- Set default for new drivers
ALTER TABLE public.drivers ALTER COLUMN trial_ends_at SET DEFAULT now() + INTERVAL '7 days';

-- RPC: can_driver_operate
-- Returns true if driver is within trial OR has sufficient wallet balance (>= R4 fee equivalent)
CREATE OR REPLACE FUNCTION public.can_driver_operate(p_driver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_driver drivers%ROWTYPE;
  v_wallet_balance numeric;
  v_rate numeric;
  v_min_usd numeric;
BEGIN
  SELECT * INTO v_driver FROM drivers WHERE user_id = p_driver_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_driver.status != 'approved' THEN RETURN false; END IF;

  -- Still in trial period
  IF v_driver.trial_ends_at IS NOT NULL AND v_driver.trial_ends_at > now() THEN
    RETURN true;
  END IF;

  -- Trial ended: check wallet balance >= 1 trip fee (R4 in USD)
  SELECT balance_usd INTO v_wallet_balance FROM driver_wallets WHERE driver_id = p_driver_id;
  IF v_wallet_balance IS NULL THEN RETURN false; END IF;

  SELECT zar_per_usd INTO v_rate FROM fx_rates ORDER BY effective_date DESC, created_at DESC LIMIT 1;
  IF v_rate IS NULL OR v_rate <= 0 THEN RETURN false; END IF;

  v_min_usd := ROUND(4.0 / v_rate, 2);
  RETURN v_wallet_balance >= v_min_usd;
END;
$$;
