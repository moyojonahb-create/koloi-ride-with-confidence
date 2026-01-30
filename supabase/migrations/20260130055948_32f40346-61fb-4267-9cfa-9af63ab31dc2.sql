-- =====================================================
-- PRE-DEPLOYMENT SECURITY FIXES
-- =====================================================

-- 1. CRITICAL: Fix profiles table - users should ONLY see their own profile
-- Drop existing policy and recreate with stricter rules
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admin policy for profiles (if needed for support)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Add policy for riders to see their assigned driver's profile during active trip
CREATE POLICY "Riders can view assigned driver profile during trip" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.drivers d ON d.id = r.driver_id
    WHERE d.user_id = profiles.user_id
    AND r.user_id = auth.uid()
    AND r.status IN ('accepted', 'in_progress', 'arrived')
  )
);

-- 3. Add policy for drivers to see their passenger's profile during active trip  
CREATE POLICY "Drivers can view passenger profile during trip" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.drivers d ON d.id = r.driver_id
    WHERE d.user_id = auth.uid()
    AND r.user_id = profiles.user_id
    AND r.status IN ('accepted', 'in_progress', 'arrived')
  )
);

-- 4. Fix drivers table - allow riders to see their assigned driver during trip
CREATE POLICY "Riders can view assigned driver during trip" 
ON public.drivers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.driver_id = drivers.id
    AND r.user_id = auth.uid()
    AND r.status IN ('accepted', 'in_progress', 'arrived')
  )
);

-- 5. Fix trip_events - allow drivers and users to INSERT their own trip events
CREATE POLICY "Users can insert events for their own rides"
ON public.trip_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rides r
    WHERE r.id = trip_events.ride_id
    AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can insert events for their assigned rides"
ON public.trip_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.drivers d ON d.id = r.driver_id
    WHERE r.id = trip_events.ride_id
    AND d.user_id = auth.uid()
  )
);

-- 6. Fix notifications - allow system to insert via service role
-- For now, create insert policy for authenticated users to receive notifications
-- (actual insertion will happen via edge function with service role)
CREATE POLICY "Service can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Only allow inserting notifications for the current user (self-notifications)
  -- or via service role (admin check acts as proxy)
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);

-- 7. Fix pricing_settings - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view pricing settings" ON public.pricing_settings;
CREATE POLICY "Authenticated users can view pricing settings" 
ON public.pricing_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 8. Add policy for riders to see driver location during active trip
CREATE POLICY "Riders can view driver location during active trip"
ON public.live_locations
FOR SELECT
USING (
  user_type = 'driver' AND
  EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.drivers d ON d.id = r.driver_id
    WHERE d.user_id = live_locations.user_id
    AND r.user_id = auth.uid()
    AND r.status IN ('accepted', 'in_progress', 'arrived')
  )
);

-- 9. Add policy for drivers to view pending rides in their area (for ride matching)
CREATE POLICY "Drivers can view pending rides"
ON public.rides
FOR SELECT
USING (
  status = 'pending' AND
  EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.user_id = auth.uid()
    AND d.status = 'approved'
    AND d.is_online = true
  )
);

-- 10. Drivers can view events for their assigned rides
CREATE POLICY "Drivers can view events for their assigned rides"
ON public.trip_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.drivers d ON d.id = r.driver_id
    WHERE r.id = trip_events.ride_id
    AND d.user_id = auth.uid()
  )
);