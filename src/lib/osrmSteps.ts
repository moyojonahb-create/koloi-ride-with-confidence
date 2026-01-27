// OSRM Step-by-step navigation with detailed route instructions
import { Coordinates } from './osrm';

const OSRM_BASE_URL = 'https://router.project-osrm.org';

export interface RouteStep {
  distance: number; // meters
  duration: number; // seconds
  name: string; // road name
  maneuver: {
    type: string;
    modifier?: string;
    bearing_before: number;
    bearing_after: number;
    location: [number, number]; // [lng, lat]
  };
  geometry: string;
}

export interface DetailedRoute {
  distanceKm: number;
  durationMinutes: number;
  geometry: string;
  steps: RouteStep[];
  waypoints: Array<{ location: [number, number]; name: string }>;
}

/**
 * Get detailed route with turn-by-turn steps from OSRM
 */
export async function getDetailedRoute(
  pickup: Coordinates,
  dropoff: Coordinates
): Promise<DetailedRoute | null> {
  try {
    const url = `${OSRM_BASE_URL}/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=polyline&steps=true`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('OSRM detailed route request failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('No detailed route found by OSRM');
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0]; // Single leg for direct route
    
    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMinutes: Math.round(route.duration / 60),
      geometry: route.geometry,
      steps: leg.steps || [],
      waypoints: data.waypoints || [],
    };
  } catch (error) {
    console.error('OSRM detailed routing error:', error);
    return null;
  }
}

/**
 * Convert OSRM maneuver type to human-readable instruction
 */
export function getManeuverInstruction(step: RouteStep): string {
  const { maneuver, name, distance } = step;
  const roadName = name && name !== '' ? ` onto ${name}` : '';
  const distanceStr = distance >= 1000 
    ? `${(distance / 1000).toFixed(1)}km` 
    : `${Math.round(distance)}m`;

  switch (maneuver.type) {
    case 'depart':
      return `Head ${getDirectionFromBearing(maneuver.bearing_after)}${roadName}`;
    
    case 'turn':
      switch (maneuver.modifier) {
        case 'left':
          return `Turn left${roadName}`;
        case 'right':
          return `Turn right${roadName}`;
        case 'slight left':
          return `Slight left${roadName}`;
        case 'slight right':
          return `Slight right${roadName}`;
        case 'sharp left':
          return `Sharp left${roadName}`;
        case 'sharp right':
          return `Sharp right${roadName}`;
        case 'uturn':
          return 'Make a U-turn';
        default:
          return `Continue${roadName}`;
      }
    
    case 'continue':
      if (maneuver.modifier === 'straight') {
        return `Continue straight${roadName} for ${distanceStr}`;
      }
      return `Continue${roadName}`;
    
    case 'merge':
      return `Merge${roadName}`;
    
    case 'fork':
      return maneuver.modifier === 'left' 
        ? `Keep left${roadName}` 
        : `Keep right${roadName}`;
    
    case 'roundabout':
      return `Enter roundabout and take exit${roadName}`;
    
    case 'arrive':
      if (maneuver.modifier === 'left') {
        return 'You have arrived, destination on left';
      } else if (maneuver.modifier === 'right') {
        return 'You have arrived, destination on right';
      }
      return 'You have arrived at your destination';
    
    default:
      return `Continue${roadName} for ${distanceStr}`;
  }
}

/**
 * Get short voice instruction for a step
 */
export function getVoiceInstruction(step: RouteStep, distanceToStep?: number): string {
  const { maneuver, distance } = step;
  
  // If we have distance to this step, announce it
  const distancePrefix = distanceToStep !== undefined && distanceToStep > 50
    ? `In ${Math.round(distanceToStep / 10) * 10} meters, `
    : '';

  switch (maneuver.type) {
    case 'depart':
      return `Head ${getDirectionFromBearing(maneuver.bearing_after)}`;
    
    case 'turn':
      switch (maneuver.modifier) {
        case 'left':
        case 'slight left':
        case 'sharp left':
          return `${distancePrefix}turn left`;
        case 'right':
        case 'slight right':
        case 'sharp right':
          return `${distancePrefix}turn right`;
        case 'uturn':
          return `${distancePrefix}make a U-turn`;
        default:
          return 'Continue straight';
      }
    
    case 'continue':
      if (distance > 200) {
        return `Continue straight for ${Math.round(distance / 100) * 100} meters`;
      }
      return 'Continue straight';
    
    case 'arrive':
      return 'You have arrived at your destination';
    
    case 'fork':
      return maneuver.modifier === 'left' ? 'Keep left' : 'Keep right';
    
    case 'roundabout':
      return 'Enter the roundabout';
    
    default:
      return 'Continue straight';
  }
}

/**
 * Get compass direction from bearing
 */
function getDirectionFromBearing(bearing: number): string {
  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Get icon name for maneuver type
 */
export function getManeuverIcon(step: RouteStep): string {
  const { maneuver } = step;
  
  switch (maneuver.type) {
    case 'turn':
      if (maneuver.modifier?.includes('left')) return 'turn-left';
      if (maneuver.modifier?.includes('right')) return 'turn-right';
      if (maneuver.modifier === 'uturn') return 'u-turn';
      return 'arrow-up';
    
    case 'fork':
      return maneuver.modifier === 'left' ? 'fork-left' : 'fork-right';
    
    case 'roundabout':
      return 'rotate-cw';
    
    case 'arrive':
      return 'flag';
    
    case 'depart':
      return 'navigation';
    
    default:
      return 'arrow-up';
  }
}

/**
 * Find current step based on driver location
 */
export function findCurrentStep(
  steps: RouteStep[],
  driverLocation: Coordinates
): { stepIndex: number; distanceToNextManeuver: number } {
  if (steps.length === 0) {
    return { stepIndex: 0, distanceToNextManeuver: 0 };
  }

  // Find the closest upcoming step
  let minDistance = Infinity;
  let closestStepIndex = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const [lng, lat] = step.maneuver.location;
    const distance = haversineDistance(
      driverLocation.lat, driverLocation.lng,
      lat, lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestStepIndex = i;
    }
  }

  return {
    stepIndex: closestStepIndex,
    distanceToNextManeuver: Math.round(minDistance * 1000), // km to meters
  };
}

/**
 * Simple Haversine distance calculation
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
