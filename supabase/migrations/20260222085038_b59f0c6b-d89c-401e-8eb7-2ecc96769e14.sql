
-- Create driver_ratings table
CREATE TABLE public.driver_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id),
  rider_id UUID NOT NULL,
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one rating per ride
CREATE UNIQUE INDEX idx_driver_ratings_ride_unique ON public.driver_ratings(ride_id);

-- Index for driver lookups
CREATE INDEX idx_driver_ratings_driver_id ON public.driver_ratings(driver_id);

-- Enable RLS
ALTER TABLE public.driver_ratings ENABLE ROW LEVEL SECURITY;

-- Riders can rate after their ride
CREATE POLICY "Riders can insert ratings for their rides"
ON public.driver_ratings FOR INSERT
WITH CHECK (
  auth.uid() = rider_id
  AND EXISTS (
    SELECT 1 FROM rides r
    WHERE r.id = driver_ratings.ride_id
    AND r.user_id = auth.uid()
    AND r.status = 'completed'
  )
);

-- Riders can view their own ratings
CREATE POLICY "Riders can view their own ratings"
ON public.driver_ratings FOR SELECT
USING (auth.uid() = rider_id);

-- Drivers can view ratings about them
CREATE POLICY "Drivers can view their own ratings"
ON public.driver_ratings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM drivers d
  WHERE d.id = driver_ratings.driver_id
  AND d.user_id = auth.uid()
));

-- Admins can manage all ratings
CREATE POLICY "Admins can manage all ratings"
ON public.driver_ratings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update driver's rating_avg after a new rating
CREATE OR REPLACE FUNCTION public.update_driver_rating_avg()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE drivers
  SET rating_avg = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM driver_ratings
    WHERE driver_id = NEW.driver_id
  )
  WHERE id = NEW.driver_id;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update rating_avg
CREATE TRIGGER trg_update_driver_rating_avg
AFTER INSERT ON public.driver_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_driver_rating_avg();

-- Add is_top_driver computed helper: drivers with rating >= 4.5 and >= 10 trips
CREATE OR REPLACE FUNCTION public.is_top_driver(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM drivers
    WHERE user_id = _user_id
    AND status = 'approved'
    AND COALESCE(rating_avg, 0) >= 4.5
    AND COALESCE(total_trips, 0) >= 10
  )
$$;
