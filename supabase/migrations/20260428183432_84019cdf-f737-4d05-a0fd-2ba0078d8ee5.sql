
-- 1. INSTITUTIONS
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('university','college','polytechnic')),
  city text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_institutions_active ON public.institutions(is_active);
CREATE INDEX idx_institutions_city ON public.institutions(city);
CREATE INDEX idx_institutions_type ON public.institutions(type);
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active institutions"
  ON public.institutions FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage institutions"
  ON public.institutions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. STUDENT PROFILES
CREATE TABLE public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id),
  registration_number text NOT NULL UNIQUE,
  national_id_number text NOT NULL UNIQUE,
  id_photo_path text,
  selfie_photo_path text,
  face_match_score numeric DEFAULT 0,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','approved','rejected','locked')),
  student_mode_active boolean NOT NULL DEFAULT false,
  device_id text,
  attempt_count integer NOT NULL DEFAULT 0,
  fraud_score integer NOT NULL DEFAULT 0,
  rejection_reason text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_profiles_user ON public.student_profiles(user_id);
CREATE INDEX idx_student_profiles_status ON public.student_profiles(verification_status);
CREATE INDEX idx_student_profiles_device ON public.student_profiles(device_id);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own student profile"
  ON public.student_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own student profile"
  ON public.student_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all student profiles"
  ON public.student_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. DISCOUNT USAGE LEDGER
CREATE TABLE public.student_discount_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ride_id uuid,
  discount_amount numeric NOT NULL DEFAULT 1.00,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_discount_user_day ON public.student_discount_usage(user_id, created_at DESC);
ALTER TABLE public.student_discount_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own discount usage"
  ON public.student_discount_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own discount usage"
  ON public.student_discount_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all discount usage"
  ON public.student_discount_usage FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. DAILY CAP HELPER (4 rides/day)
CREATE OR REPLACE FUNCTION public.can_use_student_discount(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM student_profiles
    WHERE user_id = _user_id
      AND verification_status = 'approved'
      AND student_mode_active = true
      AND fraud_score < 50
  ) AND (
    SELECT COUNT(*) FROM student_discount_usage
    WHERE user_id = _user_id
      AND created_at >= date_trunc('day', now())
  ) < 4;
$$;

-- 5. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-verification', 'student-verification', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own student docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own student docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student-verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all student docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student-verification'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 6. SEED INSTITUTIONS (Zimbabwe)
INSERT INTO public.institutions (name, type, city) VALUES
  ('University of Zimbabwe', 'university', 'Harare'),
  ('National University of Science and Technology', 'university', 'Bulawayo'),
  ('Midlands State University', 'university', 'Gweru'),
  ('Chinhoyi University of Technology', 'university', 'Chinhoyi'),
  ('Great Zimbabwe University', 'university', 'Masvingo'),
  ('Harare Institute of Technology', 'university', 'Harare'),
  ('Lupane State University', 'university', 'Lupane'),
  ('Africa University', 'university', 'Mutare'),
  ('Bindura University of Science Education', 'university', 'Bindura'),
  ('Zimbabwe Open University', 'university', 'Harare'),
  ('Catholic University of Zimbabwe', 'university', 'Harare'),
  ('Solusi University', 'university', 'Bulawayo'),
  ('Women''s University in Africa', 'university', 'Harare'),
  ('Zimbabwe Ezekiel Guti University', 'university', 'Bindura'),
  ('Manicaland State University of Applied Sciences', 'university', 'Mutare'),
  ('Marondera University of Agricultural Sciences and Technology', 'university', 'Marondera'),
  ('Gwanda State University', 'university', 'Gwanda'),
  ('Reformed Church University', 'university', 'Masvingo'),
  ('Harare Polytechnic', 'polytechnic', 'Harare'),
  ('Bulawayo Polytechnic', 'polytechnic', 'Bulawayo'),
  ('Mutare Polytechnic', 'polytechnic', 'Mutare'),
  ('Masvingo Polytechnic', 'polytechnic', 'Masvingo'),
  ('Gweru Polytechnic', 'polytechnic', 'Gweru'),
  ('Kwekwe Polytechnic', 'polytechnic', 'Kwekwe'),
  ('Kushinga Phikelela Polytechnic', 'polytechnic', 'Marondera'),
  ('Joshua Mqabuko Nkomo Polytechnic', 'polytechnic', 'Gwanda'),
  ('Speciss College', 'college', 'Harare'),
  ('Trust Academy', 'college', 'Harare'),
  ('Mutare Teachers'' College', 'college', 'Mutare'),
  ('Belvedere Technical Teachers'' College', 'college', 'Harare'),
  ('Hillside Teachers'' College', 'college', 'Bulawayo'),
  ('Morgan Zintec College', 'college', 'Harare');
