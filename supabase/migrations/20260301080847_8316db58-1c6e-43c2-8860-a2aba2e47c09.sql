
-- Create call_sessions table
CREATE TABLE public.call_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id uuid REFERENCES public.rides(id),
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'initiated',
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own call sessions"
  ON public.call_sessions FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can insert their own call sessions"
  ON public.call_sessions FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own call sessions"
  ON public.call_sessions FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
