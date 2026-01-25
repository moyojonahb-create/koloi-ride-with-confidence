-- Create storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all documents
CREATE POLICY "Admins can view all driver documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver-documents' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete documents
CREATE POLICY "Admins can delete driver documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'driver-documents' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);