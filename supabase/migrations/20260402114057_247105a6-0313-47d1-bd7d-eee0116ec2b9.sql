
-- 1. Fix wallet PIN exposure: create a safe view that hides wallet_pin
CREATE OR REPLACE VIEW public.wallets_safe
WITH (security_invoker = true) AS
SELECT id, user_id, balance, created_at, updated_at
FROM public.wallets;

-- 2. Fix ride_requests: restrict negotiating requests to online approved drivers only
DROP POLICY IF EXISTS "Authenticated users can view negotiating requests" ON public.ride_requests;
CREATE POLICY "Online drivers can view negotiating requests"
ON public.ride_requests
FOR SELECT
TO authenticated
USING (
  rider_id = auth.uid()
  OR is_online_driver(auth.uid())
);

-- 3. Add performance indexes for 100k+ scale
CREATE INDEX IF NOT EXISTS idx_rides_status_created ON public.rides (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_driver_status ON public.rides (driver_id, status);
CREATE INDEX IF NOT EXISTS idx_rides_user_status ON public.rides (user_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_ride_status ON public.offers (ride_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_driver ON public.offers (driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_ride ON public.messages (ride_id, created_at);
CREATE INDEX IF NOT EXISTS idx_live_locations_user ON public.live_locations (user_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_online ON public.live_locations (is_online, user_type);
CREATE INDEX IF NOT EXISTS idx_driver_queue_ride ON public.driver_queue (ride_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_callee ON public.call_sessions (callee_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver ON public.driver_ratings (driver_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_driver_wallets_driver ON public.driver_wallets (driver_id);

-- 4. Add request throttle tracking table for server-side rate limiting
CREATE TABLE IF NOT EXISTS public.request_throttle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.request_throttle ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_throttle_user_action ON public.request_throttle (user_id, action, created_at DESC);

-- Auto-cleanup old throttle entries (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_throttle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.request_throttle WHERE created_at < now() - interval '1 hour';
END;
$$;

-- 5. Server-side rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_requests int DEFAULT 10,
  p_window_seconds int DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.request_throttle
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > now() - (p_window_seconds || ' seconds')::interval;
  
  IF v_count >= p_max_requests THEN
    RETURN false; -- rate limited
  END IF;
  
  INSERT INTO public.request_throttle (user_id, action)
  VALUES (p_user_id, p_action);
  
  RETURN true; -- allowed
END;
$$;
