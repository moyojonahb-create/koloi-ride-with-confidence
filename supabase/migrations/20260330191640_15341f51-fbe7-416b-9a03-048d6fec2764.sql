
-- Composite indexes for high-frequency queries at scale
-- Rides: status lookups with user filtering
CREATE INDEX IF NOT EXISTS idx_rides_status_created ON public.rides (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_user_status ON public.rides (user_id, status);
CREATE INDEX IF NOT EXISTS idx_rides_driver_status ON public.rides (driver_id, status);
CREATE INDEX IF NOT EXISTS idx_rides_pending_expires ON public.rides (status, expires_at) WHERE status = 'pending';

-- Live locations: driver lookup (hot path for nearby drivers)
CREATE INDEX IF NOT EXISTS idx_live_locations_driver_online ON public.live_locations (user_type, is_online) WHERE user_type = 'driver' AND is_online = true;
CREATE INDEX IF NOT EXISTS idx_live_locations_user_id ON public.live_locations (user_id, user_type);

-- Offers: ride lookups
CREATE INDEX IF NOT EXISTS idx_offers_ride_status ON public.offers (ride_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_driver ON public.offers (driver_id, created_at DESC);

-- Drivers: user_id + status (used by GlobalRideNotifier, auth checks)
CREATE INDEX IF NOT EXISTS idx_drivers_user_status ON public.drivers (user_id, status);

-- Messages: ride_id for chat queries
CREATE INDEX IF NOT EXISTS idx_messages_ride_created ON public.messages (ride_id, created_at DESC);

-- Notifications: user unread lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

-- Call sessions: participant lookups
CREATE INDEX IF NOT EXISTS idx_call_sessions_participants ON public.call_sessions (caller_id, callee_id, status);

-- Wallet transactions
CREATE INDEX IF NOT EXISTS idx_wallet_txns_user ON public.wallet_transactions (user_id, created_at DESC);
