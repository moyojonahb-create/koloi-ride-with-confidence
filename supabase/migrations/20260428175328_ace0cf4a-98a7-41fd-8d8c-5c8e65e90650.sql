-- Fix 1: Restrict driver SELECT on rides to active statuses + completed within 24h
-- (so drivers can still see history briefly but passenger phone exposure is bounded)
DROP POLICY IF EXISTS "Drivers can view rides assigned to them" ON public.rides;

CREATE POLICY "Drivers can view rides assigned to them"
ON public.rides
FOR SELECT
USING (
  driver_id IS NOT NULL
  AND is_ride_driver(auth.uid(), driver_id)
  AND (
    status = ANY (ARRAY['accepted','in_progress','arrived','pending']::text[])
    OR (status = ANY (ARRAY['completed','cancelled','expired']::text[]) AND updated_at > now() - interval '24 hours')
  )
);

-- Fix 2: Remove incorrect auth.uid() fallback in admin_earnings driver SELECT policy
DROP POLICY IF EXISTS "Drivers can view their own earnings" ON public.admin_earnings;

CREATE POLICY "Drivers can view their own earnings"
ON public.admin_earnings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM drivers
    WHERE drivers.id = admin_earnings.driver_id
      AND drivers.user_id = auth.uid()
  )
);