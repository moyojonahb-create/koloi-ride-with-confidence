
-- Add DELETE policies for deposit-proofs bucket
CREATE POLICY "Drivers can delete their own deposit proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'deposit-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can delete deposit proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'deposit-proofs'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Add DELETE policies for rider-deposit-proofs bucket
CREATE POLICY "Riders can delete their own deposit proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rider-deposit-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can delete rider deposit proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rider-deposit-proofs'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
