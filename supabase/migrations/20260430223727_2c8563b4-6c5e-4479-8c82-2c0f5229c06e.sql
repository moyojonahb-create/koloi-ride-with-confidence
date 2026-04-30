-- 1. Defense-in-depth: explicitly deny UPDATE/DELETE on wallets for non-admin users
-- (no policy currently exists for these commands; adding explicit FOR UPDATE/DELETE policies
--  that only allow admins ensures clarity and prevents accidental future grants).
DROP POLICY IF EXISTS "No direct wallet balance updates" ON public.wallets;
CREATE POLICY "No direct wallet balance updates"
  ON public.wallets
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "No direct wallet deletes" ON public.wallets;
CREATE POLICY "No direct wallet deletes"
  ON public.wallets
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Same defense-in-depth for driver_wallets (UPDATE/DELETE only via SECURITY DEFINER RPCs or admins)
DROP POLICY IF EXISTS "No direct driver wallet updates" ON public.driver_wallets;
CREATE POLICY "No direct driver wallet updates"
  ON public.driver_wallets
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "No direct driver wallet deletes" ON public.driver_wallets;
CREATE POLICY "No direct driver wallet deletes"
  ON public.driver_wallets
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Lock down internal/trigger/cron SECURITY DEFINER functions so end-users cannot call them via PostgREST
REVOKE EXECUTE ON FUNCTION public.generate_pickme_account() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_pickme_account() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_demand_zones() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_throttle() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_messages() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.expire_old_rides() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.dispatch_scheduled_rides() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_driver_rating_avg() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_wallet() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_ride_negotiation_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_ride_expiry() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.complete_trip_and_charge_flat_r4(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM anon, authenticated, public;

-- 4. lookup_user_by_pickme_account: require authentication (currently callable anonymously)
REVOKE EXECUTE ON FUNCTION public.lookup_user_by_pickme_account(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_pickme_account(text) TO authenticated;