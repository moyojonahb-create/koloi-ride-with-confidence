import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Landmark {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  description: string | null;
  keywords: string[];
  distance?: number; // Calculated client-side when user location is available
}

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format distance for display
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

// Category icons mapping
export const getCategoryIcon = (category: string): 'landmark' | 'building' | 'pin' | 'hospital' | 'school' | 'fuel' | 'market' | 'bank' => {
  const categoryLower = category.toLowerCase();
  if (['rank', 'border', 'town'].includes(categoryLower)) return 'landmark';
  if (['hospital', 'clinic'].includes(categoryLower)) return 'hospital';
  if (['school'].includes(categoryLower)) return 'school';
  if (['fuel station'].includes(categoryLower)) return 'fuel';
  if (['market'].includes(categoryLower)) return 'market';
  if (['bank'].includes(categoryLower)) return 'bank';
  if (['shopping', 'hotel', 'government', 'church'].includes(categoryLower)) return 'building';
  return 'pin';
};

interface UseLandmarksOptions {
  userLocation?: { lat: number; lng: number } | null;
  searchQuery?: string;
  limit?: number;
}

export const useLandmarks = ({ userLocation, searchQuery = '', limit = 10 }: UseLandmarksOptions = {}) => {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all landmarks once
  useEffect(() => {
    const fetchLandmarks = async () => {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('koloi_landmarks')
        .select('*')
        .eq('is_active', true)
        .order('name');

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

  // Filter and sort landmarks based on search query and user location
  const filteredLandmarks = useMemo(() => {
    let results = [...landmarks];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter(landmark => {
        const nameMatch = landmark.name.toLowerCase().includes(query);
        const categoryMatch = landmark.category.toLowerCase().includes(query);
        const descriptionMatch = landmark.description?.toLowerCase().includes(query);
        const keywordsMatch = landmark.keywords?.some(kw => kw.toLowerCase().includes(query));
        return nameMatch || categoryMatch || descriptionMatch || keywordsMatch;
      });
    }

    // Calculate distances if user location is available
    if (userLocation) {
      results = results.map(landmark => ({
        ...landmark,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          landmark.latitude,
          landmark.longitude
        )
      }));

      // Sort by distance
      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return results.slice(0, limit);
  }, [landmarks, searchQuery, userLocation, limit]);

  // Get nearby landmarks (within specified radius in km)
  const getNearbyLandmarks = (radiusKm: number = 5): Landmark[] => {
    if (!userLocation) return [];
    
    return landmarks
      .map(landmark => ({
        ...landmark,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          landmark.latitude,
          landmark.longitude
        )
      }))
      .filter(landmark => (landmark.distance || 0) <= radiusKm)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  };

  // Find the nearest landmark to a given coordinate
  const findNearestLandmark = (lat: number, lng: number): Landmark | null => {
    if (landmarks.length === 0) return null;

    let nearest: Landmark | null = null;
    let minDistance = Infinity;

    for (const landmark of landmarks) {
      const distance = calculateDistance(lat, lng, landmark.latitude, landmark.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { ...landmark, distance };
      }
    }

    return nearest;
  };

  // Get landmarks by category
  const getLandmarksByCategory = (category: string): Landmark[] => {
    return landmarks.filter(l => l.category.toLowerCase() === category.toLowerCase());
  };

  return {
    landmarks: filteredLandmarks,
    allLandmarks: landmarks,
    loading,
    error,
    getNearbyLandmarks,
    findNearestLandmark,
    getLandmarksByCategory,
  };
};
