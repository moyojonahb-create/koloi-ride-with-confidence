
-- 1. Cancellation fees table
CREATE TABLE public.cancellation_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  waived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cancellation_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cancellation fees" ON public.cancellation_fees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cancellation fees" ON public.cancellation_fees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all cancellation fees" ON public.cancellation_fees FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Scheduled rides: add scheduled_at to rides
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';

-- 3. Promo codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value NUMERIC NOT NULL DEFAULT 10,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  min_fare NUMERIC DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active promos" ON public.promo_codes FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);
CREATE POLICY "Admins can manage all promos" ON public.promo_codes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Promo code usage tracking
CREATE TABLE public.promo_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_id UUID NOT NULL REFERENCES public.promo_codes(id),
  user_id UUID NOT NULL,
  ride_id UUID REFERENCES public.rides(id),
  discount_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(promo_id, user_id)
);
ALTER TABLE public.promo_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own promo usage" ON public.promo_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own promo usage" ON public.promo_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all promo usage" ON public.promo_usage FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  bonus_amount NUMERIC NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, paid
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referrer_id, referred_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);
CREATE POLICY "Admins can manage all referrals" ON public.referrals FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 7. Generate referral codes for existing profiles
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(md5(random()::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();

-- Generate codes for existing profiles without one
UPDATE public.profiles SET referral_code = upper(substr(md5(random()::text), 1, 6)) WHERE referral_code IS NULL;
