
-- Track each retake attempt with quality metrics for trend analysis
CREATE TABLE public.student_verification_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  student_profile_id uuid,
  photo_kind text NOT NULL CHECK (photo_kind IN ('id', 'selfie')),
  brightness numeric,
  glare boolean,
  blur numeric,
  width integer,
  height integer,
  face_match_score integer,
  verification_status text,
  rejected_step text, -- 'id' or 'selfie' or null when both ok
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_verification_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own attempts"
  ON public.student_verification_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own attempts"
  ON public.student_verification_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all attempts"
  ON public.student_verification_attempts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_sva_user ON public.student_verification_attempts(user_id, created_at DESC);
CREATE INDEX idx_sva_profile ON public.student_verification_attempts(student_profile_id, created_at DESC);
