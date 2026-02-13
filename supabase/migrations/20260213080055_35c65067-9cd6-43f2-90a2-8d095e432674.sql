-- Allow riders to view driver profiles of drivers who have made offers on their rides
CREATE POLICY "Riders can view drivers who offered on their rides"
ON public.drivers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.offers o
    JOIN public.rides r ON r.id = o.ride_id
    WHERE o.driver_id = drivers.user_id
      AND r.user_id = auth.uid()
      AND o.status = 'pending'
  )
);

-- Allow riders to view profiles of drivers who offered on their rides (for phone/name)
CREATE POLICY "Riders can view profiles of offering drivers"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.offers o
    JOIN public.rides r ON r.id = o.ride_id
    WHERE o.driver_id = profiles.user_id
      AND r.user_id = auth.uid()
      AND o.status = 'pending'
  )
);