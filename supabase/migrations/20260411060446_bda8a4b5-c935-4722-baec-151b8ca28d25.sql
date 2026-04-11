
-- Create phone_verifications table for OTP tracking
CREATE TABLE public.phone_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- No direct client access - only service role (edge functions) can manage these
-- This is intentional for security: OTP data should never be client-accessible

-- Index for fast lookups by phone
CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications (phone_number, created_at DESC);
CREATE INDEX idx_phone_verifications_expires ON public.phone_verifications (expires_at);
