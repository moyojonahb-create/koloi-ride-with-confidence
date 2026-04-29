
-- 1. Column for unique PickMe account number on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pickme_account text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_pickme_account_key
  ON public.profiles (pickme_account)
  WHERE pickme_account IS NOT NULL;

-- 2. Generator: PMR + 6 digits + R, retries on collision
CREATE OR REPLACE FUNCTION public.generate_pickme_account()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
  v_exists boolean;
  v_tries int := 0;
BEGIN
  LOOP
    v_code := 'PMR' || lpad(((random() * 999999)::int)::text, 6, '0') || 'R';
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE pickme_account = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
    v_tries := v_tries + 1;
    IF v_tries > 25 THEN
      RAISE EXCEPTION 'Could not generate unique PickMe account';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

-- 3. Trigger to assign on profile insert
CREATE OR REPLACE FUNCTION public.set_pickme_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pickme_account IS NULL THEN
    NEW.pickme_account := public.generate_pickme_account();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_pickme_account ON public.profiles;
CREATE TRIGGER trg_set_pickme_account
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pickme_account();

-- 4. Backfill existing rows
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE pickme_account IS NULL LOOP
    UPDATE public.profiles
      SET pickme_account = public.generate_pickme_account()
      WHERE id = r.id;
  END LOOP;
END $$;

-- 5. Lookup by PickMe account (for transfers) — returns minimal info
CREATE OR REPLACE FUNCTION public.lookup_user_by_pickme_account(p_account text)
RETURNS TABLE(user_id uuid, full_name text, pickme_account text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_id, full_name, pickme_account
  FROM public.profiles
  WHERE pickme_account = upper(trim(p_account))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_user_by_pickme_account(text) TO authenticated;
