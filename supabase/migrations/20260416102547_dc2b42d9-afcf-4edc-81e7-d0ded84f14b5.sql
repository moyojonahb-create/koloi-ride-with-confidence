
-- ═══════════════════════════════════════════════════════
-- 1. PERFORMANCE INDEXES on frequently queried columns
-- ═══════════════════════════════════════════════════════

-- Rides: status lookups, user lookups, driver lookups, expiry checks
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides (status);
CREATE INDEX IF NOT EXISTS idx_rides_user_id ON public.rides (user_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON public.rides (driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON public.rides (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_status_expires ON public.rides (status, expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_rides_user_status ON public.rides (user_id, status);

-- Offers: ride_id + status for quick lookups
CREATE INDEX IF NOT EXISTS idx_offers_ride_id ON public.offers (ride_id);
CREATE INDEX IF NOT EXISTS idx_offers_driver_id ON public.offers (driver_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers (status);

-- Live locations: user_id for upserts, online drivers for matching
CREATE INDEX IF NOT EXISTS idx_live_locations_user_id ON public.live_locations (user_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_online_drivers ON public.live_locations (user_type, is_online) WHERE user_type = 'driver' AND is_online = true;

-- Messages: ride_id for chat loading
CREATE INDEX IF NOT EXISTS idx_messages_ride_id ON public.messages (ride_id);

-- Notifications: user unread
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

-- Driver ratings: driver_id for avg calculation
CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver_id ON public.driver_ratings (driver_id);

-- Drivers: user_id, status, online status
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON public.drivers (user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers (status);

-- Admin earnings: driver_id for earnings dashboard
CREATE INDEX IF NOT EXISTS idx_admin_earnings_driver_id ON public.admin_earnings (driver_id);

-- Request throttle: cleanup and lookups
CREATE INDEX IF NOT EXISTS idx_request_throttle_user_action ON public.request_throttle (user_id, action, created_at DESC);

-- Fraud flags: user lookups
CREATE INDEX IF NOT EXISTS idx_fraud_flags_user_id ON public.fraud_flags (user_id);

-- Deposit requests
CREATE INDEX IF NOT EXISTS idx_deposit_requests_driver_status ON public.deposit_requests (driver_id, status);
CREATE INDEX IF NOT EXISTS idx_rider_deposit_requests_user_status ON public.rider_deposit_requests (user_id, status);

-- ═══════════════════════════════════════════════════════
-- 2. RLS POLICIES for request_throttle (security fix)
-- ═══════════════════════════════════════════════════════

-- Allow authenticated users to insert their own throttle records
CREATE POLICY "Users can insert own throttle" ON public.request_throttle
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to read own throttle entries  
CREATE POLICY "Users can read own throttle" ON public.request_throttle
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin can manage all throttle entries
CREATE POLICY "Admins can manage throttle" ON public.request_throttle
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
