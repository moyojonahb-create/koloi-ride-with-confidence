-- Create koloi_landmarks table for storing Gwanda area landmarks
CREATE TABLE public.koloi_landmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.koloi_landmarks ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (landmarks are public data)
CREATE POLICY "Anyone can view landmarks" 
ON public.koloi_landmarks 
FOR SELECT 
USING (is_active = true);

-- Create index for faster searches
CREATE INDEX idx_koloi_landmarks_name ON public.koloi_landmarks USING gin(to_tsvector('english', name));
CREATE INDEX idx_koloi_landmarks_category ON public.koloi_landmarks(category);
CREATE INDEX idx_koloi_landmarks_location ON public.koloi_landmarks(latitude, longitude);
CREATE INDEX idx_koloi_landmarks_keywords ON public.koloi_landmarks USING gin(keywords);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_koloi_landmarks_updated_at
BEFORE UPDATE ON public.koloi_landmarks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.koloi_landmarks IS 'Stores landmarks and public places for Gwanda area to support location selection where street names are missing';