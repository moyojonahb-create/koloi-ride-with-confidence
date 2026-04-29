-- Update pay_ride_from_wallet to perform full Rider Wallet -> Driver Wallet transfer
-- with 15% commission split, matching auto-deduct logic. Prevents duplicate payments
-- and negative balances. Only allows full payment of the ride fare.
CREATE OR REPLACE FUNCTION public.pay_ride_from_wallet(p_ride_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ride rides%ROWTYPE;
  v_user uuid := auth.uid();
  v_balance numeric;
  v_wallet_id uuid;
  v_driver_user_id uuid;
  v_driver_id uuid;
  v_commission numeric;
  v_driver_earnings numeric;
BEGIN
  -- Lock the ride row
  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Ride not found');
  END IF;

  -- Only the rider can pay
  IF v_ride.user_id != v_user THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not authorized');
  END IF;

  -- Prevent duplicate payment
  IF v_ride.wallet_paid THEN
    RETURN jsonb_build_object('ok', true, 'already_paid', true);
  END IF;

  -- Must be in a payable state
  IF v_ride.status NOT IN ('accepted','in_progress','arrived','completed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Ride not in payable state');
  END IF;

  -- Resolve driver
  SELECT id, user_id INTO v_driver_id, v_driver_user_id
    FROM drivers WHERE id = v_ride.driver_id;
  IF v_driver_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'No driver assigned');
  END IF;

  -- Lock and check rider wallet (full amount only, prevent negative balance)
  SELECT id, balance INTO v_wallet_id, v_balance
    FROM wallets WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_ride.fare THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Insufficient wallet balance');
  END IF;

  -- Compute split: 15% commission, rest to driver
  v_commission := ROUND(v_ride.fare * 0.15, 2);
  v_driver_earnings := v_ride.fare - v_commission;

  -- Debit rider
  UPDATE wallets SET balance = balance - v_ride.fare, updated_at = now()
    WHERE id = v_wallet_id;

  INSERT INTO wallet_transactions (wallet_id, user_id, amount, transaction_type, description, ride_id)
    VALUES (v_wallet_id, v_user, -v_ride.fare, 'ride_payment',
            'Ride payment: ' || v_ride.pickup_address || ' → ' || v_ride.dropoff_address,
            p_ride_id);

  -- Credit driver wallet with net earnings (commission goes to platform)
  INSERT INTO driver_wallets (driver_id, balance_usd)
    VALUES (v_driver_user_id, v_driver_earnings)
    ON CONFLICT (driver_id) DO UPDATE
      SET balance_usd = driver_wallets.balance_usd + EXCLUDED.balance_usd,
          updated_at = now();

  -- Record platform earnings
  INSERT INTO admin_earnings (ride_id, driver_id, fare_amount, platform_fee, driver_earnings)
    VALUES (p_ride_id, v_driver_user_id, v_ride.fare, v_commission, v_driver_earnings);

  -- Mark ride paid
  UPDATE rides
    SET wallet_paid = true, wallet_paid_at = now(), updated_at = now()
    WHERE id = p_ride_id;

  RETURN jsonb_build_object(
    'ok', true,
    'amount', v_ride.fare,
    'driver_earnings', v_driver_earnings,
    'commission', v_commission
  );
END;
$function$;

-- Update complete_trip_with_commission to skip double-charging when wallet_paid is already true
CREATE OR REPLACE FUNCTION public.complete_trip_with_commission(p_trip_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- If wallet payment already settled (via Pay Ride button), skip charging again
  IF v_ride.payment_method = 'wallet' AND v_ride.wallet_paid THEN
    v_already_credited := true;
  ELSIF v_ride.payment_method = 'wallet' AND NOT v_ride.wallet_paid THEN
    -- Auto-deduct on completion
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
    -- Only credit driver if not already credited via Pay Ride
    IF NOT v_already_credited THEN
      INSERT INTO driver_wallets (driver_id, balance_usd) VALUES (v_driver_user_id, v_driver_earnings)
        ON CONFLICT (driver_id) DO UPDATE
        SET balance_usd = driver_wallets.balance_usd + EXCLUDED.balance_usd, updated_at = now();
      INSERT INTO admin_earnings (ride_id, driver_id, fare_amount, platform_fee, driver_earnings)
        VALUES (p_trip_id, v_driver_user_id, v_fare, v_commission, v_driver_earnings);
    END IF;
  ELSE
    -- Cash flow: deduct commission from driver wallet
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
$function$;