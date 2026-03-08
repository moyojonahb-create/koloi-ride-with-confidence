
-- Town pricing profiles for inDrive-style negotiation
CREATE TABLE public.town_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  town_id text NOT NULL UNIQUE,
  town_name text NOT NULL,
  currency_code text NOT NULL DEFAULT 'USD',
  currency_symbol text NOT NULL DEFAULT '$',
  base_fare numeric NOT NULL DEFAULT 2,
  per_km_rate numeric NOT NULL DEFAULT 0.80,
  minimum_fare numeric NOT NULL DEFAULT 1,
  offer_floor numeric NOT NULL DEFAULT 1,
  offer_ceiling numeric NOT NULL DEFAULT 50,
  short_trip_fare numeric NOT NULL DEFAULT 1,
  short_trip_km numeric NOT NULL DEFAULT 2,
  night_multiplier numeric NOT NULL DEFAULT 1.2,
  demand_multiplier numeric NOT NULL DEFAULT 1.0,
  is_negotiation_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.town_pricing ENABLE ROW LEVEL SECURITY;

-- Everyone can read pricing
CREATE POLICY "Anyone can view town pricing"
  ON public.town_pricing FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage town pricing"
  ON public.town_pricing FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add counter_offer column to offers table for driver counter-offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS counter_offer numeric DEFAULT NULL;

-- Add town_id to rides table for town context
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS town_id text DEFAULT NULL;

-- Seed all Zimbabwe towns with USD pricing
INSERT INTO public.town_pricing (town_id, town_name, currency_code, currency_symbol, base_fare, per_km_rate, minimum_fare, offer_floor, offer_ceiling, short_trip_fare, short_trip_km) VALUES
  ('harare', 'Harare', 'USD', '$', 2.50, 1.00, 2.00, 1.00, 80.00, 2.00, 2),
  ('bulawayo', 'Bulawayo', 'USD', '$', 2.00, 0.80, 1.50, 1.00, 60.00, 1.50, 2),
  ('masvingo', 'Masvingo', 'USD', '$', 1.50, 0.70, 1.00, 1.00, 40.00, 1.00, 2),
  ('victoriafalls', 'Victoria Falls', 'USD', '$', 3.00, 1.20, 2.50, 2.00, 80.00, 2.50, 2),
  ('mutare', 'Mutare', 'USD', '$', 2.00, 0.80, 1.50, 1.00, 50.00, 1.50, 2),
  ('gwanda', 'Gwanda', 'ZAR', 'R', 15.00, 10.00, 15.00, 10.00, 100.00, 15.00, 2),
  ('beitbridge', 'Beitbridge', 'ZAR', 'R', 25.00, 10.00, 20.00, 15.00, 120.00, 20.00, 2),
  ('plumtree', 'Plumtree', 'USD', '$', 1.50, 0.70, 1.00, 1.00, 30.00, 1.00, 2),
  ('zvishavane', 'Zvishavane', 'USD', '$', 1.50, 0.70, 1.00, 1.00, 35.00, 1.00, 2),
  ('gweru', 'Gweru', 'USD', '$', 2.00, 0.80, 1.50, 1.00, 50.00, 1.50, 2),
  ('kadoma', 'Kadoma', 'USD', '$', 1.50, 0.70, 1.00, 1.00, 40.00, 1.00, 2),
  ('kwekwe', 'Kwekwe', 'USD', '$', 1.50, 0.70, 1.00, 1.00, 40.00, 1.00, 2),
  ('hwange', 'Hwange', 'USD', '$', 2.00, 0.80, 1.50, 1.00, 45.00, 1.50, 2)
ON CONFLICT (town_id) DO NOTHING;

-- Enable realtime for town_pricing
ALTER PUBLICATION supabase_realtime ADD TABLE public.town_pricing;
