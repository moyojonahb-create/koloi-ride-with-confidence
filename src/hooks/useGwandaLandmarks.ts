import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GWANDA_SERVICE_AREA } from '@/lib/constants';

export interface MapLandmark {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  description: string | null;
}

// Category to color mapping for map pins
export const CATEGORY_COLORS: Record<string, string> = {
  hospital: '#ef4444', // red
  clinic: '#ef4444',
  bank: '#3b82f6', // blue
  school: '#f59e0b', // amber
  church: '#8b5cf6', // purple
  government: '#6366f1', // indigo
  shopping: '#10b981', // emerald
  restaurant: '#f97316', // orange
  rank: '#14b8a6', // teal
  landmark: '#ec4899', // pink
  residential: '#84cc16', // lime
  'fuel station': '#eab308', // yellow
  hotel: '#06b6d4', // cyan
  mine: '#78716c', // stone
  market: '#22c55e', // green
  pharmacy: '#f43f5e', // rose
  default: '#6b7280', // gray
};

export const getCategoryColor = (category: string): string => {
  const categoryLower = category.toLowerCase();
  return CATEGORY_COLORS[categoryLower] || CATEGORY_COLORS.default;
};

// Gwanda bounds for map fitting
export const GWANDA_BOUNDS = {
  north: GWANDA_SERVICE_AREA.bounds.north,
  south: GWANDA_SERVICE_AREA.bounds.south,
  east: GWANDA_SERVICE_AREA.bounds.east,
  west: GWANDA_SERVICE_AREA.bounds.west,
};

export const useGwandaLandmarks = () => {
  const [landmarks, setLandmarks] = useState<MapLandmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLandmarks = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('koloi_landmarks')
        .select('id, name, category, latitude, longitude, description')
        .eq('is_active', true);

      if (fetchError) {
        console.error('Failed to fetch landmarks:', fetchError);
        setError('Failed to load landmarks');
        setLandmarks([]);
      } else {
        setLandmarks(data || []);
      }
      setLoading(false);
    };

    fetchLandmarks();
  }, []);

  return { landmarks, loading, error };
};
