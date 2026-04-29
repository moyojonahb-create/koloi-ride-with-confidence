
-- ============================================================
-- Harden EXECUTE permissions on SECURITY DEFINER functions
-- Strategy: revoke PUBLIC + anon by default, grant per intended caller.
-- In-function auth.uid()/has_role() checks remain as defense-in-depth.
-- ============================================================

-- ---------- 1. TRIGGER-ONLY FUNCTIONS (no API access at all) ----------
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.handle_new_user()',
    'public.handle_new_user_wallet()',
    'public.generate_referral_code()',
    'public.set_ride_expiry()',
    'public.update_updated_at_column()',
    'public.update_driver_rating_avg()',
    'public.update_ride_negotiation_updated_at()'
  ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- ---------- 2. CRON / MAINTENANCE (service_role only) ----------
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.cleanup_throttle()',
    'public.cleanup_old_messages()',
    'public.dispatch_scheduled_rides()',
    'public.expire_old_rides()',
    'public.update_demand_zones()'
  ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- ---------- 3. ADMIN-ONLY RPCs (authenticated, in-fn has_role gate) ----------
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.admin_approve_deposit(uuid, text)',
    'public.admin_approve_rider_deposit(uuid, text)',
    'public.admin_approve_withdrawal(uuid, text)',
    'public.admin_reject_withdrawal(uuid, text)',
    'public.admin_flag_user(uuid, text, text)',
    'public.admin_resolve_fraud_flag(uuid)',
    'public.admin_lock_wallet(uuid, text)',
    'public.admin_unlock_wallet(uuid)',
    'public.admin_reverse_transaction(uuid, text)',
    'public.admin_set_fx_rate(numeric)'
  ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

-- ---------- 4. WALLET / RIDE RPCs (authenticated only) ----------
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.pay_ride_from_wallet(uuid)',
    'public.transfer_funds(uuid, numeric, text)',
    'public.request_withdrawal(numeric, text, text, text)',
    'public.request_wallet_ride(jsonb)',
    'public.complete_trip_with_commission(uuid)',
    'public.complete_trip_and_charge_flat_r4(uuid)'
  ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

-- ---------- 5. RLS HELPER FUNCTIONS (authenticated; keep callable for policy eval) ----------
-- These are referenced inside RLS policies; they must remain executable by the
-- caller role evaluating the policy. Revoke only anon (defence-in-depth).
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'public.has_role(uuid, app_role)',
    'public.is_user_driver(uuid)',
    'public.is_online_driver(uuid)',
    'public.is_ride_driver(uuid, uuid)',
    'public.is_top_driver(uuid)',
    'public.get_driver_id(uuid)',
    'public.can_use_student_discount(uuid)',
    'public.can_change_gender(uuid)',
    'public.can_driver_operate(uuid)',
    'public.check_rate_limit(uuid, text, integer, integer)'
  ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;
