
-- Add gender column to drivers table
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS gender text DEFAULT null;

-- Insert a default FX rate so trip completion works (ZAR/USD ~18.5)
INSERT INTO public.fx_rates (zar_per_usd, effective_date)
SELECT 18.5, CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM public.fx_rates LIMIT 1);
