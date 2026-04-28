ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS id_photo_quality jsonb,
  ADD COLUMN IF NOT EXISTS selfie_photo_quality jsonb;

COMMENT ON COLUMN public.student_profiles.id_photo_quality IS 'Client-measured quality: { brightness:0-100, glare:boolean, blur:0-100 }';
COMMENT ON COLUMN public.student_profiles.selfie_photo_quality IS 'Client-measured quality: { brightness:0-100, glare:boolean, blur:0-100 }';