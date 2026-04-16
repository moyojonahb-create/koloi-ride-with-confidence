
-- Add gender column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL;

-- Create gender change log table
CREATE TABLE IF NOT EXISTS public.gender_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_gender text,
  new_gender text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gender_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gender changes"
  ON public.gender_change_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gender changes"
  ON public.gender_change_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all gender changes"
  ON public.gender_change_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for efficient lookups
CREATE INDEX idx_gender_change_log_user ON public.gender_change_log(user_id, created_at DESC);

-- Function: check if user can change gender (30-day cooldown)
CREATE OR REPLACE FUNCTION public.can_change_gender(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM gender_change_log
    WHERE user_id = p_user_id
      AND created_at > now() - interval '30 days'
  )
$$;
