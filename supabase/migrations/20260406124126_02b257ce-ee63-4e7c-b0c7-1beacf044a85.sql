
-- Fix 1: driver_feedback RLS policies - use proper join through drivers table
DROP POLICY IF EXISTS "Drivers can insert their own feedback" ON public.driver_feedback;
DROP POLICY IF EXISTS "Drivers can view their own feedback" ON public.driver_feedback;

CREATE POLICY "Drivers can insert their own feedback"
ON public.driver_feedback FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.user_id = auth.uid()
    AND d.user_id = driver_feedback.driver_id
  )
);

CREATE POLICY "Drivers can view their own feedback"
ON public.driver_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.user_id = auth.uid()
    AND d.user_id = driver_feedback.driver_id
  )
);

-- Fix 2: Remove the overly permissive pending rides policy and replace with restricted version
DROP POLICY IF EXISTS "Drivers can view pending rides" ON public.rides;

-- Drivers can view pending rides but NOT passenger_phone or passenger_name
-- Since RLS cannot restrict columns, we create a restrictive policy that only works
-- when drivers query through the pending_rides_safe view.
-- For direct rides table access, drivers only see rides assigned to them (existing policy).
-- We re-add a pending rides policy but it now requires using the safe view pattern.

-- Actually, the pending_rides_safe view already strips PII. The issue is that the direct
-- RLS policy on rides also grants access. We should NOT re-add a direct pending rides policy.
-- Drivers should use the pending_rides_safe view to browse pending rides.
-- The existing "Drivers can view rides assigned to them" policy handles accepted rides.
