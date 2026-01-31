-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Drivers can view rides assigned to them" ON public.rides;
DROP POLICY IF EXISTS "Drivers can update rides assigned to them" ON public.rides;

-- Create a security definer function to check if user is the assigned driver for a ride
CREATE OR REPLACE FUNCTION public.is_ride_driver(_user_id uuid, _driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.drivers d
    WHERE d.id = _driver_id
      AND d.user_id = _user_id
  )
$$;

-- Recreate the policies using the security definer function
CREATE POLICY "Drivers can view rides assigned to them"
ON public.rides
FOR SELECT
TO authenticated
USING (
  driver_id IS NOT NULL 
  AND public.is_ride_driver(auth.uid(), driver_id)
);

CREATE POLICY "Drivers can update rides assigned to them"
ON public.rides
FOR UPDATE
TO authenticated
USING (
  driver_id IS NOT NULL 
  AND public.is_ride_driver(auth.uid(), driver_id)
)
WITH CHECK (
  driver_id IS NOT NULL 
  AND public.is_ride_driver(auth.uid(), driver_id)
);