
CREATE TABLE public.system_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggestion TEXT,
  affected_users INTEGER DEFAULT 0,
  context TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  period TEXT NOT NULL DEFAULT 'today',
  scan_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all error logs"
ON public.system_error_logs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_system_error_logs_period ON public.system_error_logs(period);
CREATE INDEX idx_system_error_logs_severity ON public.system_error_logs(severity);
CREATE INDEX idx_system_error_logs_created ON public.system_error_logs(created_at DESC);
CREATE INDEX idx_system_error_logs_resolved ON public.system_error_logs(resolved);
