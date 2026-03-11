-- 1. Fix rides default status from 'completed' to 'pending'
ALTER TABLE public.rides ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Allow authenticated users to insert their own fraud flags
CREATE POLICY "Users can insert their own fraud flags"
  ON public.fraud_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow authenticated riders to see online driver locations (for nearby drivers feature)
CREATE POLICY "Riders can view online driver locations"
  ON public.live_locations
  FOR SELECT
  TO authenticated
  USING (user_type = 'driver' AND is_online = true);

-- 4. Allow system/drivers to insert into driver_queue (needed for ride dispatch)
CREATE POLICY "System can insert driver queue entries"
  ON public.driver_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Add UPDATE policy for wallets so users can set/change their PIN
CREATE POLICY "Users can update their own wallet"
  ON public.wallets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);