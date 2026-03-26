
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quiet_ride boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cool_temperature boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wav_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hearing_impaired boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gender_preference text NOT NULL DEFAULT 'any';
