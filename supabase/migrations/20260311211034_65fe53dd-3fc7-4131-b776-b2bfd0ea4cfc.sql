
-- Add gender_preference column to rides table for women-only ride matching
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS gender_preference text DEFAULT 'any';

-- Add fraud_flags table for fraud detection
CREATE TABLE IF NOT EXISTS public.fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  details jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud flags"
  ON public.fraud_flags FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own flags"
  ON public.fraud_flags FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- Add ride_demand_zones table for driver heatmaps
CREATE TABLE IF NOT EXISTS public.ride_demand_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  town_id text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  demand_score integer NOT NULL DEFAULT 0,
  ride_count integer NOT NULL DEFAULT 0,
  time_bucket text NOT NULL DEFAULT 'all',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ride_demand_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view demand zones"
  ON public.ride_demand_zones FOR SELECT
  TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage demand zones"
  ON public.ride_demand_zones FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update demand zones from ride data
CREATE OR REPLACE FUNCTION public.update_demand_zones()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_town RECORD;
  v_grid_size double precision := 0.005; -- ~500m grid
BEGIN
  -- Clear and rebuild from last 24h of rides
  DELETE FROM ride_demand_zones;
  
  INSERT INTO ride_demand_zones (town_id, latitude, longitude, demand_score, ride_count, time_bucket)
  SELECT 
    COALESCE(town_id, 'unknown'),
    ROUND(pickup_lat / v_grid_size) * v_grid_size as grid_lat,
    ROUND(pickup_lon / v_grid_size) * v_grid_size as grid_lon,
    COUNT(*)::integer as demand_score,
    COUNT(*)::integer as ride_count,
    CASE 
      WHEN EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 9 THEN 'morning'
      WHEN EXTRACT(HOUR FROM created_at) BETWEEN 10 AND 15 THEN 'midday'
      WHEN EXTRACT(HOUR FROM created_at) BETWEEN 16 AND 19 THEN 'evening'
      ELSE 'night'
    END as time_bucket
  FROM rides
  WHERE created_at > now() - interval '24 hours'
    AND status IN ('pending', 'accepted', 'completed', 'in_progress')
  GROUP BY town_id, grid_lat, grid_lon, time_bucket;
END;
$$;
