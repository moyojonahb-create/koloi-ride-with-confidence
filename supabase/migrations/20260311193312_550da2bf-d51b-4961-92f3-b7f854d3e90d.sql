
-- Fix: Restrict offers SELECT so drivers only see their own offers + offers on pending rides (without sensitive details of other drivers' offers)
DROP POLICY IF EXISTS "Drivers can view offers for pending rides" ON public.offers;

-- Drivers can view their own offers
CREATE POLICY "Drivers can view their own offers"
ON public.offers FOR SELECT TO authenticated
USING (driver_id = auth.uid());

-- Drivers can view pending ride offers (to know if a ride already has offers, but they can only see summary)
CREATE POLICY "Drivers can view offers on pending rides"
ON public.offers FOR SELECT TO authenticated
USING (
  is_user_driver(auth.uid())
  AND EXISTS (
    SELECT 1 FROM rides r
    WHERE r.id = offers.ride_id
    AND r.status = 'pending'
  )
  AND driver_id = auth.uid()
);
