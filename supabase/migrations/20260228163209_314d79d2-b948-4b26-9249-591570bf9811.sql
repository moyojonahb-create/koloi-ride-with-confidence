
-- Update the ride expiry trigger to use 5 minutes instead of 30 seconds
CREATE OR REPLACE FUNCTION public.set_ride_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '5 minutes';
  END IF;
  RETURN NEW;
END;
$function$;
