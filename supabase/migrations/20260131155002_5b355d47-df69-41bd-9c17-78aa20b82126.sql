-- Fix infinite recursion by simplifying the INSERT policy and ensuring clean evaluation
-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can create their own rides" ON public.rides;

-- Create a cleaner INSERT policy that won't trigger recursive checks
CREATE POLICY "Users can create their own rides"
ON public.rides
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also add a policy for riders to update their own rides (cancel, etc.)
DROP POLICY IF EXISTS "Users can update their own rides" ON public.rides;

CREATE POLICY "Users can update their own rides"
ON public.rides
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);