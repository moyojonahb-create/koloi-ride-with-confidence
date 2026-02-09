-- Create wallets table for drivers
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet transactions table
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'trip_fee', 'refund')),
  description TEXT,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin earnings table to track platform fees
CREATE TABLE public.admin_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  driver_id UUID NOT NULL,
  fare_amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  driver_earnings NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_earnings ENABLE ROW LEVEL SECURITY;

-- Wallets policies
CREATE POLICY "Users can view their own wallet"
ON public.wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
ON public.wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON public.wallets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all wallets"
ON public.wallets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Wallet transactions policies
CREATE POLICY "Users can view their own transactions"
ON public.wallet_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.wallet_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all transactions"
ON public.wallet_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin earnings policies
CREATE POLICY "Admins can view all earnings"
ON public.admin_earnings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert earnings"
ON public.admin_earnings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers can view their own earnings"
ON public.admin_earnings FOR SELECT
USING (driver_id = auth.uid());

-- Create trigger for wallet updated_at
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();