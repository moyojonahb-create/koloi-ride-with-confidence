
-- Disputes table for trip dispute resolution
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid NOT NULL,
  reporter_role text NOT NULL DEFAULT 'rider',
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Users can create disputes for their own rides
CREATE POLICY "Users can create own disputes" ON public.disputes
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Users can view their own disputes
CREATE POLICY "Users can view own disputes" ON public.disputes
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Admins can update disputes
CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_disputes_ride ON public.disputes(ride_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reporter ON public.disputes(reporter_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status, created_at DESC);

-- Enable realtime for emergency_alerts so admin gets live notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
