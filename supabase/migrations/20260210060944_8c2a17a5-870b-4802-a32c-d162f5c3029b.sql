
-- Add expires_at column to rides table
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Set default expiry for new rides (30 seconds from creation)
-- We use a trigger instead of a default to allow flexibility
CREATE OR REPLACE FUNCTION public.set_ride_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Only set expires_at for pending rides if not already set
  IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '30 seconds';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ride_expiry_trigger
BEFORE INSERT ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.set_ride_expiry();

-- RPC to expire old pending rides
CREATE OR REPLACE FUNCTION public.expire_old_rides()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE rides
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Enable realtime for rides table (ensure it's enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
