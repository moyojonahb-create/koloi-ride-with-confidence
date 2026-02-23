// Multi-town configuration for Koloi
// Each town has its own service area, bounds, and quick picks

export interface TownConfig {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radiusKm: number;
  maxDistanceKm: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  nominatimViewbox: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  quickPicks: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    icon: 'rank' | 'cbd' | 'hospital' | 'shopping' | 'police' | 'fuel' | 'school';
  }[];
  // Coordinate validation bounds for OSM import (wider than service area)
  importBounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export const TOWNS: TownConfig[] = [
  {
    id: 'gwanda',
    name: 'Gwanda',
    center: { lat: -20.9355, lng: 29.0147 },
    radiusKm: 15,
    maxDistanceKm: 20,
    bounds: {
      north: -20.85,
      south: -20.98,
      east: 29.08,
      west: 28.95,
    },
    nominatimViewbox: {
      left: 28.8107,
      top: -20.7614,
      right: 29.1967,
      bottom: -21.1214,
    },
    quickPicks: [
      { id: 'rank', name: 'Gwanda Rank', lat: -20.9380, lng: 29.0120, icon: 'rank' },
      { id: 'cbd', name: 'CBD', lat: -20.9355, lng: 29.0147, icon: 'cbd' },
      { id: 'hospital', name: 'Hospital', lat: -20.9410, lng: 29.0180, icon: 'hospital' },
      { id: 'shopping', name: 'Shops', lat: -20.9365, lng: 29.0135, icon: 'shopping' },
      { id: 'police', name: 'Police', lat: -20.9345, lng: 29.0155, icon: 'police' },
    ],
    importBounds: {
      minLat: -21.5,
      maxLat: -20.5,
      minLng: 28.5,
      maxLng: 29.5,
    },
  },
  {
    id: 'beitbridge',
    name: 'Beitbridge',
    center: { lat: -22.2170, lng: 29.9900 },
    radiusKm: 10,
    maxDistanceKm: 15,
    bounds: {
      north: -22.14,
      south: -22.28,
      east: 30.05,
      west: 29.93,
    },
    nominatimViewbox: {
      left: 29.87,
      top: -22.10,
      right: 30.07,
      bottom: -22.30,
    },
    quickPicks: [
      { id: 'rank', name: 'Beitbridge Rank', lat: -22.2170, lng: 29.9900, icon: 'rank' },
      { id: 'cbd', name: 'Beitbridge CBD', lat: -22.2170, lng: 29.9920, icon: 'cbd' },
      { id: 'hospital', name: 'Beitbridge Hospital', lat: -22.2130, lng: 29.9870, icon: 'hospital' },
      { id: 'border', name: 'Border Post', lat: -22.2280, lng: 29.9860, icon: 'police' },
    ],
    importBounds: {
      minLat: -22.35,
      maxLat: -22.05,
      minLng: 29.85,
      maxLng: 30.15,
    },
  },
];

// Default town fallback
export const DEFAULT_TOWN = TOWNS[0]; // Gwanda

// Haversine distance in km
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Detect which town the user is in based on GPS coordinates.
 * Returns the closest town within maxDistanceKm, or default (Gwanda).
 */
export const detectTown = (lat: number, lng: number): TownConfig => {
  let closest: TownConfig = DEFAULT_TOWN;
  let closestDist = Infinity;

  for (const town of TOWNS) {
    const dist = haversineDistance(lat, lng, town.center.lat, town.center.lng);
    if (dist <= town.maxDistanceKm && dist < closestDist) {
      closest = town;
      closestDist = dist;
    }
  }

  return closest;
};

/**
 * Check if coordinates are within ANY town's service area.
 */
export const isWithinAnyServiceArea = (lat: number, lng: number): boolean => {
  return TOWNS.some(town => {
    const { bounds, maxDistanceKm, center } = town;
    if (lat < bounds.south || lat > bounds.north || lng < bounds.west || lng > bounds.east) {
      return false;
    }
    return haversineDistance(center.lat, center.lng, lat, lng) <= maxDistanceKm;
  });
};

/**
 * Check if coordinates are within a specific town's service area.
 */
export const isWithinTownServiceArea = (town: TownConfig, lat: number, lng: number): boolean => {
  const { bounds, maxDistanceKm, center } = town;
  if (lat < bounds.south || lat > bounds.north || lng < bounds.west || lng > bounds.east) {
    return false;
  }
  return haversineDistance(center.lat, center.lng, lat, lng) <= maxDistanceKm;
};

/**
 * Get town by ID.
 */
export const getTownById = (id: string): TownConfig | undefined => {
  return TOWNS.find(t => t.id === id);
};

/**
 * Check if coordinates fall within any town's import bounds (for OSM import validation).
 */
export const isWithinImportBounds = (lat: number, lng: number): boolean => {
  return TOWNS.some(town => {
    const { importBounds } = town;
    return lat >= importBounds.minLat && lat <= importBounds.maxLat &&
           lng >= importBounds.minLng && lng <= importBounds.maxLng;
  });
};
