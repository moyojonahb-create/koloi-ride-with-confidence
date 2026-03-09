
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
  SELECT * INTO v_ride FROM rides WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Ride not found');
  END IF;

  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = v_ride.driver_id;
  IF v_driver_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'No driver assigned');
  END IF;

  -- Allow both driver and rider to complete
  IF auth.uid() != v_driver_user_id AND auth.uid() != v_ride.user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not authorized');
  END IF;

  v_fare := v_ride.fare;
  v_commission := ROUND(v_fare * 0.15, 2);
  v_driver_earnings := v_fare - v_commission;

  SELECT * INTO v_wallet FROM driver_wallets WHERE driver_id = v_driver_user_id;
  IF NOT FOUND OR v_wallet.balance_usd < v_commission THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient wallet balance for commission');
  END IF;

  UPDATE driver_wallets
  SET balance_usd = balance_usd - v_commission, updated_at = now()
  WHERE driver_id = v_driver_user_id;

  INSERT INTO admin_earnings (ride_id, driver_id, fare_amount, platform_fee, driver_earnings)
  VALUES (p_trip_id, v_driver_user_id, v_fare, v_commission, v_driver_earnings);

  UPDATE rides SET status = 'completed', updated_at = now() WHERE id = p_trip_id;

  RETURN jsonb_build_object(
    'ok', true,
    'fare_usd', v_fare,
    'commission_usd', v_commission,
    'driver_earnings_usd', v_driver_earnings
  );
END;
$function$;
