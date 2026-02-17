
-- Create driver_feedback table for suggestions/complaints
CREATE TABLE public.driver_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('suggestion', 'complaint')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_feedback ENABLE ROW LEVEL SECURITY;

-- Drivers can insert their own feedback
CREATE POLICY "Drivers can insert their own feedback"
ON public.driver_feedback FOR INSERT
WITH CHECK (auth.uid() = driver_id);

-- Drivers can view their own feedback
CREATE POLICY "Drivers can view their own feedback"
ON public.driver_feedback FOR SELECT
USING (auth.uid() = driver_id);

-- Admins can manage all feedback
CREATE POLICY "Admins can manage all feedback"
ON public.driver_feedback FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_driver_feedback_updated_at
BEFORE UPDATE ON public.driver_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
