
-- Update complete_trip_with_commission to use USD directly (no ZAR conversion)
CREATE OR REPLACE FUNCTION public.complete_trip_with_commission(p_trip_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ride rides%ROWTYPE;
  v_driver_user_id uuid;
  v_fare numeric;
  v_commission numeric;
  v_driver_earnings numeric;
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

  -- Calculate 15% commission in USD
  v_fare := v_ride.fare;
  v_commission := ROUND(v_fare * 0.15, 2);
  v_driver_earnings := v_fare - v_commission;

  -- Check wallet balance for commission
  SELECT * INTO v_wallet FROM driver_wallets WHERE driver_id = v_driver_user_id;
  IF NOT FOUND OR v_wallet.balance_usd < v_commission THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient wallet balance for commission');
  END IF;

  -- Deduct commission from driver wallet
  UPDATE driver_wallets
  SET balance_usd = balance_usd - v_commission, updated_at = now()
  WHERE driver_id = v_driver_user_id;

  -- Record in admin_earnings
  INSERT INTO admin_earnings (ride_id, driver_id, fare_amount, platform_fee, driver_earnings)
  VALUES (p_trip_id, v_driver_user_id, v_fare, v_commission, v_driver_earnings);

  -- Mark ride completed
  UPDATE rides SET status = 'completed', updated_at = now() WHERE id = p_trip_id;

  RETURN jsonb_build_object(
    'ok', true,
    'fare_zar', v_fare,
    'commission_zar', v_commission,
    'commission_usd', v_commission,
    'driver_earnings_zar', v_driver_earnings
  );
END;
$function$;

-- Update can_driver_operate to use simple USD balance check (no FX rate needed)
CREATE OR REPLACE FUNCTION public.can_driver_operate(p_driver_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_driver drivers%ROWTYPE;
  v_wallet_balance numeric;
BEGIN
  SELECT * INTO v_driver FROM drivers WHERE user_id = p_driver_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_driver.status != 'approved' THEN RETURN false; END IF;

  -- Still in trial period
  IF v_driver.trial_ends_at IS NOT NULL AND v_driver.trial_ends_at > now() THEN
    RETURN true;
  END IF;

  -- Trial ended: check wallet balance >= $0.50 (minimum commission)
  SELECT balance_usd INTO v_wallet_balance FROM driver_wallets WHERE driver_id = p_driver_id;
  IF v_wallet_balance IS NULL THEN RETURN false; END IF;

  RETURN v_wallet_balance >= 0.50;
END;
$function$;
