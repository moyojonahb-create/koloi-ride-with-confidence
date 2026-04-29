CREATE UNIQUE INDEX IF NOT EXISTS idx_rider_deposit_requests_reference_unique
  ON public.rider_deposit_requests (reference);