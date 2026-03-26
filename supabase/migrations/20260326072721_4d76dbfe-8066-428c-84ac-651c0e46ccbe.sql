
-- Deduplicate phone numbers: keep the most recent profile per phone, null out older ones
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at DESC) AS rn
  FROM profiles
  WHERE phone IS NOT NULL AND phone != ''
)
UPDATE profiles SET phone = NULL
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Now add unique partial index on phone
CREATE UNIQUE INDEX profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL AND phone != '';
