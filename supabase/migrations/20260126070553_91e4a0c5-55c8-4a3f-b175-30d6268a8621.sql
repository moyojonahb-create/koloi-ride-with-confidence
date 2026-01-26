-- Create pricing_settings table for dynamic fare configuration
CREATE TABLE public.pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_fare numeric NOT NULL DEFAULT 20,
  per_km_rate numeric NOT NULL DEFAULT 10,
  min_fare numeric NOT NULL DEFAULT 25,
  max_town_fare numeric NOT NULL DEFAULT 50,
  fixed_town_fare numeric NOT NULL DEFAULT 50,
  town_radius_km numeric NOT NULL DEFAULT 5,
  peak_multiplier numeric NOT NULL DEFAULT 1.2,
  night_multiplier numeric NOT NULL DEFAULT 1.3,
  gwanda_cbd_lat numeric NOT NULL DEFAULT -20.933,
  gwanda_cbd_lng numeric NOT NULL DEFAULT 29.013,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read pricing settings (needed for fare calculation)
CREATE POLICY "Anyone can view pricing settings"
ON public.pricing_settings
FOR SELECT
USING (true);

-- Only admins can update pricing settings
CREATE POLICY "Admins can update pricing settings"
ON public.pricing_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert pricing settings
CREATE POLICY "Admins can insert pricing settings"
ON public.pricing_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default pricing settings row
INSERT INTO public.pricing_settings (
  base_fare, per_km_rate, min_fare, max_town_fare, fixed_town_fare,
  town_radius_km, peak_multiplier, night_multiplier, gwanda_cbd_lat, gwanda_cbd_lng
) VALUES (20, 10, 25, 50, 50, 5, 1.2, 1.3, -20.933, 29.013);

-- Create trigger for updated_at
CREATE TRIGGER update_pricing_settings_updated_at
BEFORE UPDATE ON public.pricing_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();