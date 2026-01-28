// Koloi Contact Information
export const KOLOI_CONTACT = {
  phone: "+263 778 553169",
  email: "moyojonahb@gmail.com",
  address: "Gwanda Town",
  poweredBy: "Powered by Tautona TEK 2026",
};

// Gwanda Service Area Configuration
// The service area extends from Gwanda CBD to Blanket Mine (~15km radius)
export const GWANDA_SERVICE_AREA = {
  // Gwanda CBD center
  center: {
    lat: -20.9355,
    lng: 29.0147,
  },
  // Blanket Mine location (northern boundary)
  blanketMine: {
    lat: -20.8950,
    lng: 29.0450,
  },
  // Service radius in kilometers (covers Gwanda to Blanket Mine)
  radiusKm: 15,
  // Maximum allowed distance from center for pickups/dropoffs
  maxDistanceKm: 20,
  // Town boundaries (approximate bounding box)
  bounds: {
    north: -20.85,  // North of Blanket Mine
    south: -20.98,  // South of Gwanda
    east: 29.08,    // East boundary
    west: 28.95,    // West boundary
  },
};

// Check if a location is within the Gwanda service area
export const isWithinServiceArea = (lat: number, lng: number): boolean => {
  const { bounds, center, maxDistanceKm } = GWANDA_SERVICE_AREA;
  
  // First check bounding box (fast check)
  if (lat < bounds.south || lat > bounds.north || lng < bounds.west || lng > bounds.east) {
    return false;
  }
  
  // Then check distance from center (more accurate)
  const distance = calculateHaversineDistance(center.lat, center.lng, lat, lng);
  return distance <= maxDistanceKm;
};

// Haversine distance calculation
export const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

// Format location label with "Near X" fallback
export const formatLocationLabel = (name: string, nearestLandmark?: string): string => {
  if (name && name.trim()) {
    return name;
  }
  if (nearestLandmark) {
    return `Near ${nearestLandmark}`;
  }
  return 'Selected Location';
};

// Common Gwanda area names for fuzzy matching
export const GWANDA_AREAS = [
  'CBD', 'Town', 'Center', 'Centre',
  'Phakama', 'Jahunda', 'Geneva', 'Ko Nare', 'Konare',
  'Njanji', 'Jacaranda', 'Spitzkop', 'Spitzkop View',
  'Garikai', 'Mtshingwe', 'Blanket', 'Blanket Mine',
  'Main Road', 'Hospital Road', 'School Road',
];

// Keywords that indicate location types for better matching
export const LOCATION_KEYWORDS = [
  'near', 'close to', 'next to', 'opposite', 'behind',
  'corner', 'junction', 'intersection', 'turning',
  'shop', 'store', 'market', 'rank', 'stop',
  'school', 'church', 'clinic', 'hospital',
  'mine', 'gate', 'entrance', 'road', 'street',
];