-- Make driver-avatars bucket private (authenticated access only)
UPDATE storage.buckets SET public = false WHERE id = 'driver-avatars';

-- Drop the old public policy
DROP POLICY IF EXISTS "Anyone can view driver avatars" ON storage.objects;

-- Allow authenticated users to view driver avatars
CREATE POLICY "Authenticated users can view driver avatars"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-avatars'
  AND auth.uid() IS NOT NULL
);