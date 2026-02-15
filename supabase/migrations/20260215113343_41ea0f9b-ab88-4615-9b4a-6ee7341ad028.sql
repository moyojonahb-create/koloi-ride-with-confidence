
-- Add avatar_url column to drivers table
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create public storage bucket for driver avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-avatars', 'driver-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow drivers to upload their own avatar
CREATE POLICY "Drivers can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow drivers to update their own avatar
CREATE POLICY "Drivers can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'driver-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to driver avatars
CREATE POLICY "Anyone can view driver avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver-avatars');

-- Allow drivers to delete their own avatar
CREATE POLICY "Drivers can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'driver-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
