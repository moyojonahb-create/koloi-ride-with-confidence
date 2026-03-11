
-- Add multi-stop support: ride_stops table
CREATE TABLE IF NOT EXISTS public.ride_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL DEFAULT 1,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  arrived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_ride_stops_ride_id ON public.ride_stops(ride_id);

-- Enable RLS
ALTER TABLE public.ride_stops ENABLE ROW LEVEL SECURITY;

-- Riders can see their own ride stops
CREATE POLICY "Riders can view own ride stops" ON public.ride_stops
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.rides WHERE rides.id = ride_stops.ride_id AND rides.user_id = auth.uid())
  );

-- Riders can insert stops for their own rides
CREATE POLICY "Riders can insert own ride stops" ON public.ride_stops
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rides WHERE rides.id = ride_stops.ride_id AND rides.user_id = auth.uid())
  );

-- Drivers assigned to ride can view stops
CREATE POLICY "Drivers can view assigned ride stops" ON public.ride_stops
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides r
      JOIN public.drivers d ON d.id = r.driver_id
      WHERE r.id = ride_stops.ride_id AND d.user_id = auth.uid()
    )
  );

-- Drivers can update arrived_at on assigned ride stops
CREATE POLICY "Drivers can update assigned ride stops" ON public.ride_stops
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides r
      JOIN public.drivers d ON d.id = r.driver_id
      WHERE r.id = ride_stops.ride_id AND d.user_id = auth.uid()
    )
  );

-- Add driver_queue table for fair ride distribution
CREATE TABLE IF NOT EXISTS public.driver_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, ride_id)
);

CREATE INDEX idx_driver_queue_ride ON public.driver_queue(ride_id, position);
CREATE INDEX idx_driver_queue_driver ON public.driver_queue(driver_id, status);

ALTER TABLE public.driver_queue ENABLE ROW LEVEL SECURITY;

-- Drivers can see their own queue entries
CREATE POLICY "Drivers see own queue" ON public.driver_queue
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_queue.driver_id AND drivers.user_id = auth.uid())
  );

-- Drivers can update their own queue entries (accept/decline)
CREATE POLICY "Drivers update own queue" ON public.driver_queue
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_queue.driver_id AND drivers.user_id = auth.uid())
  );

-- Function to dispatch scheduled rides
CREATE OR REPLACE FUNCTION public.dispatch_scheduled_rides()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dispatched_count INTEGER := 0;
BEGIN
  -- Find rides scheduled within the next 5 minutes and still in 'scheduled' status
  UPDATE public.rides
  SET status = 'pending',
      updated_at = now()
  WHERE status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= now() + interval '5 minutes'
    AND scheduled_at > now() - interval '30 minutes';

  GET DIAGNOSTICS dispatched_count = ROW_COUNT;
  RETURN dispatched_count;
END;
$$;
