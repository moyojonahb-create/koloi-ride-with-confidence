
-- Create ride_requests table
CREATE TABLE IF NOT EXISTS public.ride_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id uuid NOT NULL,
  pickup text NOT NULL,
  dropoff text NOT NULL,
  offered_fare numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'negotiating',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ride_offers table
CREATE TABLE IF NOT EXISTS public.ride_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  offer_fare numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(request_id, driver_id)
);

-- Enable RLS
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_offers ENABLE ROW LEVEL SECURITY;

-- ride_requests policies
CREATE POLICY "Riders can insert their own requests"
  ON public.ride_requests FOR INSERT
  WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Riders can view their own requests"
  ON public.ride_requests FOR SELECT
  USING (auth.uid() = rider_id);

CREATE POLICY "Riders can update their own requests"
  ON public.ride_requests FOR UPDATE
  USING (auth.uid() = rider_id);

CREATE POLICY "Authenticated users can view negotiating requests"
  ON public.ride_requests FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'negotiating');

-- ride_offers policies
CREATE POLICY "Drivers can insert their own offers"
  ON public.ride_offers FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own offers"
  ON public.ride_offers FOR UPDATE
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can view their own offers"
  ON public.ride_offers FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Riders can view offers on their requests"
  ON public.ride_offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ride_requests r
      WHERE r.id = ride_offers.request_id AND r.rider_id = auth.uid()
    )
  );

CREATE POLICY "Riders can update offers on their requests"
  ON public.ride_offers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ride_requests r
      WHERE r.id = ride_offers.request_id AND r.rider_id = auth.uid()
    )
  );

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_offers;

-- Updated_at trigger function (reuse existing or create)
CREATE OR REPLACE FUNCTION public.update_ride_negotiation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ride_requests_updated_at
  BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_ride_negotiation_updated_at();

CREATE TRIGGER update_ride_offers_updated_at
  BEFORE UPDATE ON public.ride_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_ride_negotiation_updated_at();
