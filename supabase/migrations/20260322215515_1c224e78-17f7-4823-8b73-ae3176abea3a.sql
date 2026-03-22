
-- 1. Emergency alerts table
CREATE TABLE public.emergency_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES public.rides(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own alerts" ON public.emergency_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own alerts" ON public.emergency_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all alerts" ON public.emergency_alerts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Ride preferences table
CREATE TABLE public.ride_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL UNIQUE,
  quiet_ride boolean NOT NULL DEFAULT false,
  cool_temperature boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ride_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can insert preferences for their rides" ON public.ride_preferences FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_preferences.ride_id AND rides.user_id = auth.uid()));
CREATE POLICY "Riders can view preferences for their rides" ON public.ride_preferences FOR SELECT USING (EXISTS (SELECT 1 FROM rides WHERE rides.id = ride_preferences.ride_id AND rides.user_id = auth.uid()));
CREATE POLICY "Drivers can view preferences for assigned rides" ON public.ride_preferences FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM rides r JOIN drivers d ON d.id = r.driver_id WHERE r.id = ride_preferences.ride_id AND d.user_id = auth.uid()));
CREATE POLICY "Admins can manage all preferences" ON public.ride_preferences FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Tips table
CREATE TABLE public.tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES public.rides(id) ON DELETE SET NULL,
  rider_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can insert their own tips" ON public.tips FOR INSERT TO authenticated WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Riders can view their own tips" ON public.tips FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Drivers can view tips received" ON public.tips FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "Admins can manage all tips" ON public.tips FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Eco stats table
CREATE TABLE public.eco_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_co2_saved_kg numeric NOT NULL DEFAULT 0,
  shared_rides_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eco_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own eco stats" ON public.eco_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert their own eco stats" ON public.eco_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own eco stats" ON public.eco_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all eco stats" ON public.eco_stats FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Driver fatigue sessions
CREATE TABLE public.driver_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  went_online_at timestamptz NOT NULL DEFAULT now(),
  went_offline_at timestamptz,
  forced_break_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can manage their own sessions" ON public.driver_sessions FOR ALL TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Admins can manage all sessions" ON public.driver_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Add accessibility columns to drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS is_wav boolean NOT NULL DEFAULT false;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS is_hearing_impaired boolean NOT NULL DEFAULT false;

-- 7. Add locked_price to rides
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS locked_price numeric;

-- 8. Add cancellation_fee_amount to rides for display
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS cancellation_fee numeric DEFAULT 0;
