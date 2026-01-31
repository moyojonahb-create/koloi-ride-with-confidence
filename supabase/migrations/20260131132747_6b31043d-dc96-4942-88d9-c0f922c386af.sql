-- Add policy to deny anonymous access to trip_events table
-- This ensures only authenticated users can view trip events

CREATE POLICY "Deny anonymous access to trip_events"
ON public.trip_events
FOR SELECT
USING (auth.uid() IS NOT NULL);