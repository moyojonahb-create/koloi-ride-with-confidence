-- Enable RLS on realtime.messages and add channel authorization policy
-- This restricts which authenticated users can subscribe to which Realtime channel topics

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists (idempotent)
DROP POLICY IF EXISTS "Authorize realtime channel subscriptions" ON realtime.messages;

CREATE POLICY "Authorize realtime channel subscriptions"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Per-ride channels: ride-{id}, offers-{id}, ride-status-{id}, ride:{id}
  -- Allow only the rider or the assigned driver (by user_id) of the ride
  (
    (
      realtime.topic() LIKE 'ride-%'
      OR realtime.topic() LIKE 'offers-%'
      OR realtime.topic() LIKE 'ride-status-%'
      OR realtime.topic() LIKE 'ride:%'
    )
    AND EXISTS (
      SELECT 1
      FROM public.rides r
      LEFT JOIN public.drivers d ON d.id = r.driver_id
      WHERE r.id::text = regexp_replace(realtime.topic(), '^(ride-|offers-|ride-status-|ride:)', '')
        AND (r.user_id = (SELECT auth.uid()) OR d.user_id = (SELECT auth.uid()))
    )
  )

  -- Per-user driver status channel: driver-status-{userId} or global-ride-notifier-{userId}
  OR (
    (
      realtime.topic() LIKE 'driver-status-%'
      OR realtime.topic() LIKE 'global-ride-notifier-%'
    )
    AND (
      regexp_replace(realtime.topic(), '^(driver-status-|global-ride-notifier-)', '') = (SELECT auth.uid())::text
    )
  )

  -- Driver-only broadcast channels
  OR (
    realtime.topic() IN ('open-rides', 'driver-ride-requests')
    AND public.is_user_driver((SELECT auth.uid()))
  )

  -- Admin-only channels
  OR (
    realtime.topic() = 'admin-emergency-alerts'
    AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  )
);

-- Also allow INSERT (broadcast/presence sends) under the same authorization
DROP POLICY IF EXISTS "Authorize realtime channel writes" ON realtime.messages;

CREATE POLICY "Authorize realtime channel writes"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    (
      realtime.topic() LIKE 'ride-%'
      OR realtime.topic() LIKE 'offers-%'
      OR realtime.topic() LIKE 'ride-status-%'
      OR realtime.topic() LIKE 'ride:%'
    )
    AND EXISTS (
      SELECT 1
      FROM public.rides r
      LEFT JOIN public.drivers d ON d.id = r.driver_id
      WHERE r.id::text = regexp_replace(realtime.topic(), '^(ride-|offers-|ride-status-|ride:)', '')
        AND (r.user_id = (SELECT auth.uid()) OR d.user_id = (SELECT auth.uid()))
    )
  )
  OR (
    (
      realtime.topic() LIKE 'driver-status-%'
      OR realtime.topic() LIKE 'global-ride-notifier-%'
    )
    AND regexp_replace(realtime.topic(), '^(driver-status-|global-ride-notifier-)', '') = (SELECT auth.uid())::text
  )
  OR (
    realtime.topic() IN ('open-rides', 'driver-ride-requests')
    AND public.is_user_driver((SELECT auth.uid()))
  )
  OR (
    realtime.topic() = 'admin-emergency-alerts'
    AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  )
);