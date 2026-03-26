CREATE POLICY "Drivers can view preferences for pending rides"
ON public.ride_preferences
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rides r
    WHERE r.id = ride_preferences.ride_id
      AND r.status = 'pending'
      AND is_online_driver(auth.uid())
  )
);