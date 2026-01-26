-- Fix: Add RLS policy so drivers can view rides assigned to them
CREATE POLICY "Drivers can view rides assigned to them"
ON public.rides
FOR SELECT
USING (
  auth.uid() IN (
    SELECT d.user_id FROM drivers d WHERE d.id = rides.driver_id
  )
);

-- Fix: Add RLS policy so drivers can update ride status for their assigned rides
CREATE POLICY "Drivers can update rides assigned to them"
ON public.rides
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT d.user_id FROM drivers d WHERE d.id = rides.driver_id
  )
);

-- Fix: Ensure admin can view all rides for oversight
CREATE POLICY "Admins can view all rides"
ON public.rides
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix: Ensure admin can manage all rides
CREATE POLICY "Admins can manage all rides"
ON public.rides
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix: Add policy for pricing_settings DELETE (admins only)
CREATE POLICY "Admins can delete pricing settings"
ON public.pricing_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));