// Multi-town configuration for Voyex
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
    bounds: { north: -22.14, south: -22.28, east: 30.05, west: 29.93 },
    nominatimViewbox: { left: 29.87, top: -22.10, right: 30.07, bottom: -22.30 },
    quickPicks: [
      { id: 'rank', name: 'Beitbridge Rank', lat: -22.2170, lng: 29.9900, icon: 'rank' },
      { id: 'cbd', name: 'Beitbridge CBD', lat: -22.2170, lng: 29.9920, icon: 'cbd' },
      { id: 'hospital', name: 'Beitbridge Hospital', lat: -22.2130, lng: 29.9870, icon: 'hospital' },
      { id: 'border', name: 'Border Post', lat: -22.2280, lng: 29.9860, icon: 'police' },
    ],
    importBounds: { minLat: -22.35, maxLat: -22.05, minLng: 29.85, maxLng: 30.15 },
  },
  {
    id: 'bulawayo',
    name: 'Bulawayo',
    center: { lat: -20.1500, lng: 28.5800 },
    radiusKm: 25,
    maxDistanceKm: 35,
    bounds: { north: -20.05, south: -20.25, east: 28.70, west: 28.45 },
    nominatimViewbox: { left: 28.40, top: -20.00, right: 28.75, bottom: -20.30 },
    quickPicks: [
      { id: 'rank', name: 'Renkini Bus Terminus', lat: -20.1530, lng: 28.5750, icon: 'rank' },
      { id: 'cbd', name: 'Bulawayo CBD', lat: -20.1500, lng: 28.5800, icon: 'cbd' },
      { id: 'hospital', name: 'Mpilo Hospital', lat: -20.1620, lng: 28.5650, icon: 'hospital' },
      { id: 'shopping', name: 'Bulawayo Centre', lat: -20.1490, lng: 28.5810, icon: 'shopping' },
    ],
    importBounds: { minLat: -20.35, maxLat: -19.95, minLng: 28.35, maxLng: 28.85 },
  },
  {
    id: 'harare',
    name: 'Harare',
    center: { lat: -17.8292, lng: 31.0522 },
    radiusKm: 30,
    maxDistanceKm: 40,
    bounds: { north: -17.70, south: -17.95, east: 31.18, west: 30.92 },
    nominatimViewbox: { left: 30.88, top: -17.65, right: 31.22, bottom: -18.00 },
    quickPicks: [
      { id: 'rank', name: 'Fourth St Bus Terminus', lat: -17.8310, lng: 31.0480, icon: 'rank' },
      { id: 'cbd', name: 'Harare CBD', lat: -17.8292, lng: 31.0522, icon: 'cbd' },
      { id: 'hospital', name: 'Parirenyatwa Hospital', lat: -17.8190, lng: 31.0440, icon: 'hospital' },
      { id: 'shopping', name: 'Sam Levy Village', lat: -17.7870, lng: 31.0450, icon: 'shopping' },
    ],
    importBounds: { minLat: -18.10, maxLat: -17.60, minLng: 30.80, maxLng: 31.30 },
  },
  {
    id: 'masvingo',
    name: 'Masvingo',
    center: { lat: -20.0744, lng: 30.8328 },
    radiusKm: 15,
    maxDistanceKm: 20,
    bounds: { north: -19.99, south: -20.15, east: 30.92, west: 30.75 },
    nominatimViewbox: { left: 30.70, top: -19.94, right: 30.97, bottom: -20.20 },
    quickPicks: [
      { id: 'rank', name: 'Masvingo Rank', lat: -20.0750, lng: 30.8310, icon: 'rank' },
      { id: 'cbd', name: 'Masvingo CBD', lat: -20.0744, lng: 30.8328, icon: 'cbd' },
      { id: 'hospital', name: 'Masvingo General Hospital', lat: -20.0700, lng: 30.8280, icon: 'hospital' },
    ],
    importBounds: { minLat: -20.25, maxLat: -19.85, minLng: 30.65, maxLng: 31.05 },
  },
  {
    id: 'victoriafalls',
    name: 'Victoria Falls',
    center: { lat: -17.9318, lng: 25.8325 },
    radiusKm: 12,
    maxDistanceKm: 18,
    bounds: { north: -17.85, south: -18.01, east: 25.92, west: 25.75 },
    nominatimViewbox: { left: 25.70, top: -17.80, right: 25.97, bottom: -18.06 },
    quickPicks: [
      { id: 'rank', name: 'Vic Falls Rank', lat: -17.9320, lng: 25.8300, icon: 'rank' },
      { id: 'cbd', name: 'Vic Falls Town', lat: -17.9318, lng: 25.8325, icon: 'cbd' },
      { id: 'falls', name: 'The Falls', lat: -17.9243, lng: 25.8572, icon: 'shopping' },
    ],
    importBounds: { minLat: -18.10, maxLat: -17.75, minLng: 25.65, maxLng: 26.05 },
  },
  {
    id: 'mutare',
    name: 'Mutare',
    center: { lat: -18.9707, lng: 32.6709 },
    radiusKm: 15,
    maxDistanceKm: 20,
    bounds: { north: -18.89, south: -19.05, east: 32.75, west: 32.59 },
    nominatimViewbox: { left: 32.54, top: -18.84, right: 32.80, bottom: -19.10 },
    quickPicks: [
      { id: 'rank', name: 'Sakubva Musika', lat: -18.9750, lng: 32.6800, icon: 'rank' },
      { id: 'cbd', name: 'Mutare CBD', lat: -18.9707, lng: 32.6709, icon: 'cbd' },
      { id: 'hospital', name: 'Mutare General Hospital', lat: -18.9680, lng: 32.6650, icon: 'hospital' },
    ],
    importBounds: { minLat: -19.15, maxLat: -18.75, minLng: 32.45, maxLng: 32.90 },
  },
  {
    id: 'plumtree',
    name: 'Plumtree',
    center: { lat: -20.4850, lng: 27.8130 },
    radiusKm: 8,
    maxDistanceKm: 12,
    bounds: { north: -20.42, south: -20.55, east: 27.88, west: 27.74 },
    nominatimViewbox: { left: 27.70, top: -20.38, right: 27.92, bottom: -20.59 },
    quickPicks: [
      { id: 'rank', name: 'Plumtree Rank', lat: -20.4850, lng: 27.8130, icon: 'rank' },
      { id: 'cbd', name: 'Plumtree CBD', lat: -20.4850, lng: 27.8140, icon: 'cbd' },
      { id: 'border', name: 'Plumtree Border', lat: -20.4900, lng: 27.8100, icon: 'police' },
    ],
    importBounds: { minLat: -20.60, maxLat: -20.35, minLng: 27.65, maxLng: 27.95 },
  },
  {
    id: 'zvishavane',
    name: 'Zvishavane',
    center: { lat: -20.3280, lng: 30.0320 },
    radiusKm: 10,
    maxDistanceKm: 15,
    bounds: { north: -20.25, south: -20.40, east: 30.10, west: 29.96 },
    nominatimViewbox: { left: 29.92, top: -20.21, right: 30.14, bottom: -20.44 },
    quickPicks: [
      { id: 'rank', name: 'Zvishavane Rank', lat: -20.3280, lng: 30.0320, icon: 'rank' },
      { id: 'cbd', name: 'Zvishavane CBD', lat: -20.3280, lng: 30.0330, icon: 'cbd' },
      { id: 'hospital', name: 'Zvishavane Hospital', lat: -20.3250, lng: 30.0290, icon: 'hospital' },
    ],
    importBounds: { minLat: -20.50, maxLat: -20.15, minLng: 29.85, maxLng: 30.20 },
  },
  {
    id: 'gweru',
    name: 'Gweru',
    center: { lat: -19.4500, lng: 29.8167 },
    radiusKm: 15,
    maxDistanceKm: 20,
    bounds: { north: -19.37, south: -19.53, east: 29.90, west: 29.73 },
    nominatimViewbox: { left: 29.68, top: -19.32, right: 29.95, bottom: -19.58 },
    quickPicks: [
      { id: 'rank', name: 'Kudzanayi Bus Terminus', lat: -19.4520, lng: 29.8150, icon: 'rank' },
      { id: 'cbd', name: 'Gweru CBD', lat: -19.4500, lng: 29.8167, icon: 'cbd' },
      { id: 'hospital', name: 'Gweru General Hospital', lat: -19.4470, lng: 29.8120, icon: 'hospital' },
    ],
    importBounds: { minLat: -19.60, maxLat: -19.30, minLng: 29.65, maxLng: 30.00 },
  },
  {
    id: 'kadoma',
    name: 'Kadoma',
    center: { lat: -18.3333, lng: 29.9167 },
    radiusKm: 12,
    maxDistanceKm: 18,
    bounds: { north: -18.25, south: -18.42, east: 30.00, west: 29.83 },
    nominatimViewbox: { left: 29.78, top: -18.20, right: 30.05, bottom: -18.47 },
    quickPicks: [
      { id: 'rank', name: 'Kadoma Rank', lat: -18.3340, lng: 29.9160, icon: 'rank' },
      { id: 'cbd', name: 'Kadoma CBD', lat: -18.3333, lng: 29.9167, icon: 'cbd' },
      { id: 'hospital', name: 'Kadoma General Hospital', lat: -18.3300, lng: 29.9130, icon: 'hospital' },
    ],
    importBounds: { minLat: -18.50, maxLat: -18.15, minLng: 29.75, maxLng: 30.10 },
  },
  {
    id: 'kwekwe',
    name: 'Kwekwe',
    center: { lat: -18.9281, lng: 29.8142 },
    radiusKm: 12,
    maxDistanceKm: 18,
    bounds: { north: -18.85, south: -19.01, east: 29.90, west: 29.73 },
    nominatimViewbox: { left: 29.68, top: -18.80, right: 29.95, bottom: -19.06 },
    quickPicks: [
      { id: 'rank', name: 'Kwekwe Rank', lat: -18.9290, lng: 29.8140, icon: 'rank' },
      { id: 'cbd', name: 'Kwekwe CBD', lat: -18.9281, lng: 29.8142, icon: 'cbd' },
      { id: 'hospital', name: 'Kwekwe General Hospital', lat: -18.9250, lng: 29.8100, icon: 'hospital' },
    ],
    importBounds: { minLat: -19.10, maxLat: -18.75, minLng: 29.65, maxLng: 30.00 },
  },
  {
    id: 'hwange',
    name: 'Hwange',
    center: { lat: -18.3647, lng: 26.5000 },
    radiusKm: 12,
    maxDistanceKm: 18,
    bounds: { north: -18.28, south: -18.45, east: 26.58, west: 26.42 },
    nominatimViewbox: { left: 26.37, top: -18.23, right: 26.63, bottom: -18.50 },
    quickPicks: [
      { id: 'rank', name: 'Hwange Rank', lat: -18.3650, lng: 26.5000, icon: 'rank' },
      { id: 'cbd', name: 'Hwange Town', lat: -18.3647, lng: 26.5000, icon: 'cbd' },
      { id: 'hospital', name: 'Hwange Colliery Hospital', lat: -18.3620, lng: 26.4960, icon: 'hospital' },
    ],
    importBounds: { minLat: -18.55, maxLat: -18.20, minLng: 26.30, maxLng: 26.70 },
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
