CREATE OR REPLACE FUNCTION public.update_demand_zones()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grid_size double precision := 0.005; -- ~500m grid
BEGIN
  -- Safe-delete pattern for environments enforcing DELETE ... WHERE
  DELETE FROM public.ride_demand_zones
  WHERE id IS NOT NULL;

  INSERT INTO public.ride_demand_zones (town_id, latitude, longitude, demand_score, ride_count, time_bucket)
  SELECT
    COALESCE(town_id, 'unknown'),
    ROUND(pickup_lat / v_grid_size) * v_grid_size AS grid_lat,
    ROUND(pickup_lon / v_grid_size) * v_grid_size AS grid_lon,
    COUNT(*)::integer AS demand_score,
    COUNT(*)::integer AS ride_count,
    CASE
      WHEN EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 9 THEN 'morning'
      WHEN EXTRACT(HOUR FROM created_at) BETWEEN 10 AND 15 THEN 'midday'
      WHEN EXTRACT(HOUR FROM created_at) BETWEEN 16 AND 19 THEN 'evening'
      ELSE 'night'
    END AS time_bucket
  FROM public.rides
  WHERE created_at > now() - interval '24 hours'
    AND status IN ('pending', 'accepted', 'completed', 'in_progress')
  GROUP BY town_id, grid_lat, grid_lon, time_bucket;
END;
$$;
