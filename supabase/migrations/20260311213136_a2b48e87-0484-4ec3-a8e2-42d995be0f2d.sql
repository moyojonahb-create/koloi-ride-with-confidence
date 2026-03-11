-- Fix overly permissive driver_queue INSERT policy
DROP POLICY "System can insert driver queue entries" ON public.driver_queue;

-- Only allow drivers to insert queue entries for themselves
CREATE POLICY "Drivers can insert own queue entries"
  ON public.driver_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_queue.driver_id
      AND drivers.user_id = auth.uid()
    )
  );