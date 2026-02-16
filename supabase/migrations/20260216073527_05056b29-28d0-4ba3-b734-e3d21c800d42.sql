
-- Create platform_ledger table
CREATE TABLE public.platform_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL UNIQUE,
  driver_id UUID,
  passenger_id UUID,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  to_account_id TEXT NOT NULL DEFAULT '98855',
  status TEXT NOT NULL DEFAULT 'SETTLED',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_ledger ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins can manage platform_ledger"
  ON public.platform_ledger FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Riders can view their own settlements
CREATE POLICY "Users can view their own settlements"
  ON public.platform_ledger FOR SELECT
  USING (auth.uid() = passenger_id);

-- Drivers can view their own settlements
CREATE POLICY "Drivers can view their own settlements"
  ON public.platform_ledger FOR SELECT
  USING (auth.uid() = driver_id);

-- Add foreign key to rides
ALTER TABLE public.platform_ledger
  ADD CONSTRAINT platform_ledger_trip_id_fkey
  FOREIGN KEY (trip_id) REFERENCES public.rides(id);
