-- Move wallet_pin to a separate, client-inaccessible table
CREATE TABLE IF NOT EXISTS public.wallet_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_pins ENABLE ROW LEVEL SECURITY;

-- No client-facing policies. Only service_role (used by the edge function) can read/write.
-- (Service role bypasses RLS by design.)

-- Migrate any existing PIN hashes from wallets into wallet_pins
INSERT INTO public.wallet_pins (user_id, pin_hash)
SELECT user_id, wallet_pin FROM public.wallets
WHERE wallet_pin IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Drop the exposed column from wallets
ALTER TABLE public.wallets DROP COLUMN IF EXISTS wallet_pin;

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_wallet_pins_updated_at ON public.wallet_pins;
CREATE TRIGGER update_wallet_pins_updated_at
BEFORE UPDATE ON public.wallet_pins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();