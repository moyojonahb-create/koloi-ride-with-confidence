ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS passenger_name text DEFAULT NULL;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS passenger_phone text DEFAULT NULL;