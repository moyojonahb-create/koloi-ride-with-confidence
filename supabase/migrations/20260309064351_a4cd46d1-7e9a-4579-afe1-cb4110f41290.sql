
-- New function: complete trip with 15% platform commission
-- Records in admin_earnings and deducts from driver wallet
CREATE OR REPLACE FUNCTION public.complete_trip_with_commission(p_trip_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ride rides%ROWTYPE;
  v_driver_user_id uuid;
  v_rate numeric;
  v_fare_zar numeric;
  v_commission_zar numeric;
  v_commission_usd numeric;
  v_driver_earnings_zar numeric;
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

  -- Calculate 15% commission
  v_fare_zar := v_ride.fare;
  v_commission_zar := ROUND(v_fare_zar * 0.15, 2);
  v_driver_earnings_zar := v_fare_zar - v_commission_zar;
  v_commission_usd := ROUND(v_commission_zar / v_rate, 2);

  -- Check wallet balance for commission
  SELECT * INTO v_wallet FROM driver_wallets WHERE driver_id = v_driver_user_id;
  IF NOT FOUND OR v_wallet.balance_usd < v_commission_usd THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient wallet balance for commission');
  END IF;

  -- Deduct commission from driver wallet
  UPDATE driver_wallets
  SET balance_usd = balance_usd - v_commission_usd, updated_at = now()
  WHERE driver_id = v_driver_user_id;

  -- Record in admin_earnings
  INSERT INTO admin_earnings (ride_id, driver_id, fare_amount, platform_fee, driver_earnings)
  VALUES (p_trip_id, v_driver_user_id, v_fare_zar, v_commission_zar, v_driver_earnings_zar);

  -- Mark ride completed
  UPDATE rides SET status = 'completed', updated_at = now() WHERE id = p_trip_id;

  RETURN jsonb_build_object(
    'ok', true,
    'fare_zar', v_fare_zar,
    'commission_zar', v_commission_zar,
    'commission_usd', v_commission_usd,
    'driver_earnings_zar', v_driver_earnings_zar,
    'zar_per_usd', v_rate
  );
END;
$$;
