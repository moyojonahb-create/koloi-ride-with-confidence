ALTER TABLE public.ride_preferences 
  ADD COLUMN IF NOT EXISTS wav_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hearing_impaired boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gender_preference text NOT NULL DEFAULT 'any';