
-- ═══════════════════════════════════════════════════════════════
-- Safe realtime enablement + remaining indexes + unique constraints
-- (Triggers and most indexes applied in previous migration)
-- ═══════════════════════════════════════════════════════════════

-- ─── ENABLE REALTIME (safe — skip if already member) ───
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_queue;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_offers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── UNIQUE CONSTRAINTS (data integrity) ───
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id_unique ON public.profiles (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_id_unique ON public.wallets (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_wallets_driver_id_unique ON public.driver_wallets (driver_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_user_id_unique ON public.drivers (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_locations_user_id_unique ON public.live_locations (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_eco_stats_user_id_unique ON public.eco_stats (user_id);


-- ─── REMAINING INDEXES (from failed batch) ───
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON public.deposit_requests (status);
CREATE INDEX IF NOT EXISTS idx_rider_deposit_requests_status ON public.rider_deposit_requests (status);
CREATE INDEX IF NOT EXISTS idx_driver_queue_ride_id ON public.driver_queue (ride_id);
CREATE INDEX IF NOT EXISTS idx_driver_queue_driver_id ON public.driver_queue (driver_id);
CREATE INDEX IF NOT EXISTS idx_koloi_landmarks_active ON public.koloi_landmarks (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_koloi_landmarks_category ON public.koloi_landmarks (category);
CREATE INDEX IF NOT EXISTS idx_ride_requests_rider_id ON public.ride_requests (rider_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON public.ride_requests (status);
CREATE INDEX IF NOT EXISTS idx_ride_offers_request_id ON public.ride_offers (request_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_id ON public.favorite_locations (user_id);
