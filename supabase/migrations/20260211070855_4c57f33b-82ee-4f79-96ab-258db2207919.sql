
-- Places cache for Nominatim results
CREATE TABLE public.places_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  display_name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  osm_type TEXT,
  osm_id BIGINT,
  class TEXT,
  type TEXT,
  address JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast coordinate lookups
CREATE INDEX idx_places_cache_coords ON public.places_cache (lat, lon);

-- Index for text search
CREATE INDEX idx_places_cache_display_name ON public.places_cache USING gin (to_tsvector('english', display_name));

-- Unique constraint to prevent duplicate caching of same OSM entity
CREATE UNIQUE INDEX idx_places_cache_osm_unique ON public.places_cache (osm_type, osm_id) WHERE osm_type IS NOT NULL AND osm_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;

-- Public read access (cache is shared data)
CREATE POLICY "Anyone can read cached places"
ON public.places_cache FOR SELECT
USING (true);

-- Authenticated users can insert (cache new lookups)
CREATE POLICY "Authenticated users can cache places"
ON public.places_cache FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
