-- Fix infinite recursion by using security definer functions

-- Create a security definer function to check if user is a driver
CREATE OR REPLACE FUNCTION public.is_user_driver(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.drivers
    WHERE user_id = _user_id
      AND status = 'approved'
  )
$$;

-- Create a security definer function to check if user is an online approved driver
CREATE OR REPLACE FUNCTION public.is_online_driver(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.drivers
    WHERE user_id = _user_id
      AND status = 'approved'
      AND is_online = true
  )
$$;

-- Create a security definer function to get driver_id from user_id
CREATE OR REPLACE FUNCTION public.get_driver_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.drivers WHERE user_id = _user_id LIMIT 1
$$;

-- Drop and recreate drivers policies to avoid recursion
DROP POLICY IF EXISTS "Riders can view assigned driver during trip" ON public.drivers;

CREATE POLICY "Riders can view assigned driver during trip"
ON public.drivers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rides r
    WHERE r.driver_id = drivers.id
      AND r.user_id = auth.uid()
      AND r.status IN ('accepted', 'in_progress', 'arrived')
  )
);

-- Fix rides policies that cause recursion with drivers
DROP POLICY IF EXISTS "Drivers can view pending rides" ON public.rides;

CREATE POLICY "Drivers can view pending rides"
ON public.rides
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND is_online_driver(auth.uid())
);

-- Recreate other driver-related policies on rides using security definer
DROP POLICY IF EXISTS "Drivers can view rides assigned to them" ON public.rides;

CREATE POLICY "Drivers can view rides assigned to them"
ON public.rides
FOR SELECT
TO authenticated
USING (
  driver_id IS NOT NULL
  AND is_ride_driver(auth.uid(), driver_id)
);

DROP POLICY IF EXISTS "Drivers can update rides assigned to them" ON public.rides;

CREATE POLICY "Drivers can update rides assigned to them"
ON public.rides
FOR UPDATE
TO authenticated
USING (
  driver_id IS NOT NULL
  AND is_ride_driver(auth.uid(), driver_id)
)
WITH CHECK (
  driver_id IS NOT NULL
  AND is_ride_driver(auth.uid(), driver_id)
);

-- Fix offers policies
DROP POLICY IF EXISTS "Drivers can create offers" ON public.offers;

CREATE POLICY "Drivers can create offers"
ON public.offers
FOR INSERT
TO authenticated
WITH CHECK (
  driver_id = auth.uid()
  AND is_user_driver(auth.uid())
);

DROP POLICY IF EXISTS "Drivers can view offers for pending rides" ON public.offers;

CREATE POLICY "Drivers can view offers for pending rides"
ON public.offers
FOR SELECT
TO authenticated
USING (
  is_user_driver(auth.uid())
);

-- Fix live_locations policies
DROP POLICY IF EXISTS "Riders can view driver location during active trip" ON public.live_locations;

CREATE POLICY "Riders can view driver location during active trip"
ON public.live_locations
FOR SELECT
TO authenticated
USING (
  user_type = 'driver'
  AND EXISTS (
    SELECT 1
    FROM public.rides r
    WHERE r.driver_id = get_driver_id(live_locations.user_id)
      AND r.user_id = auth.uid()
      AND r.status IN ('accepted', 'in_progress', 'arrived')
  )
);

-- Fix messages policies
DROP POLICY IF EXISTS "Drivers can send messages on their assigned rides" ON public.messages;
DROP POLICY IF EXISTS "Drivers can view messages for their assigned rides" ON public.messages;

CREATE POLICY "Drivers can send messages on their assigned rides"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.rides r
    WHERE r.id = messages.ride_id
      AND r.driver_id = get_driver_id(auth.uid())
  )
);

CREATE POLICY "Drivers can view messages for their assigned rides"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rides r
    WHERE r.id = messages.ride_id
      AND r.driver_id = get_driver_id(auth.uid())
  )
);

-- Fix profiles policies
DROP POLICY IF EXISTS "Drivers can view passenger profile during trip" ON public.profiles;
DROP POLICY IF EXISTS "Riders can view assigned driver profile during trip" ON public.profiles;

CREATE POLICY "Drivers can view passenger profile during trip"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rides r
    WHERE r.driver_id = get_driver_id(auth.uid())
      AND r.user_id = profiles.user_id
      AND r.status IN ('accepted', 'in_progress', 'arrived')
  )
);

CREATE POLICY "Riders can view assigned driver profile during trip"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rides r
    WHERE r.driver_id IS NOT NULL
      AND is_ride_driver(profiles.user_id, r.driver_id)
      AND r.user_id = auth.uid()
      AND r.status IN ('accepted', 'in_progress', 'arrived')
  )
);

-- Fix trip_events policies
DROP POLICY IF EXISTS "Drivers can insert events for their assigned rides" ON public.trip_events;
DROP POLICY IF EXISTS "Drivers can view events for their assigned rides" ON public.trip_events;

CREATE POLICY "Drivers can insert events for their assigned rides"
ON public.trip_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.rides r
    WHERE r.id = trip_events.ride_id
      AND r.driver_id = get_driver_id(auth.uid())
  )
);

CREATE POLICY "Drivers can view events for their assigned rides"
ON public.trip_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.rides r
    WHERE r.id = trip_events.ride_id
      AND r.driver_id = get_driver_id(auth.uid())
  )
);