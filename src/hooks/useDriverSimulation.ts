// Pilot testing mode - Simulates driver movement along a route
import { useState, useCallback, useRef, useEffect } from 'react';
import { Coordinates } from '@/lib/osrm';

interface SimulationState {
  isRunning: boolean;
  currentLocation: Coordinates | null;
  progress: number; // 0-100
  speed: 'slow' | 'normal' | 'fast';
  isPaused: boolean;
}

interface UseDriverSimulationOptions {
  routePoints: Coordinates[];
  onLocationUpdate?: (location: Coordinates) => void;
  onComplete?: () => void;
}

// Speed in points per second
const SPEED_MAP = {
  slow: 0.5,    // ~5 km/h for testing
  normal: 2,    // ~20 km/h town driving
  fast: 5,      // ~50 km/h for quick testing
};

export function useDriverSimulation({
  routePoints,
  onLocationUpdate,
  onComplete,
}: UseDriverSimulationOptions) {
  const [state, setState] = useState<SimulationState>({
    isRunning: false,
    currentLocation: null,
    progress: 0,
    speed: 'normal',
    isPaused: false,
  });

  const currentIndexRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  // Interpolate between two points
  const interpolate = useCallback((
    from: Coordinates,
    to: Coordinates,
    t: number
  ): Coordinates => {
    return {
      lat: from.lat + (to.lat - from.lat) * t,
      lng: from.lng + (to.lng - from.lng) * t,
    };
  }, []);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (state.isPaused) {
      lastTimeRef.current = timestamp;
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = (timestamp - lastTimeRef.current) / 1000; // seconds
    lastTimeRef.current = timestamp;

    const pointsPerSecond = SPEED_MAP[state.speed];
    const pointsToMove = deltaTime * pointsPerSecond;

    currentIndexRef.current += pointsToMove;

    if (currentIndexRef.current >= routePoints.length - 1) {
      // Reached destination
      const finalPoint = routePoints[routePoints.length - 1];
      setState(prev => ({
        ...prev,
        isRunning: false,
        currentLocation: finalPoint,
        progress: 100,
      }));
      onLocationUpdate?.(finalPoint);
      onComplete?.();
      return;
    }

    // Interpolate position
    const currentIdx = Math.floor(currentIndexRef.current);
    const t = currentIndexRef.current - currentIdx;
    const from = routePoints[currentIdx];
    const to = routePoints[Math.min(currentIdx + 1, routePoints.length - 1)];
    const newLocation = interpolate(from, to, t);

    const progress = (currentIndexRef.current / (routePoints.length - 1)) * 100;

    setState(prev => ({
      ...prev,
      currentLocation: newLocation,
      progress,
    }));

    onLocationUpdate?.(newLocation);

    if (state.isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [state.isPaused, state.speed, state.isRunning, routePoints, interpolate, onLocationUpdate, onComplete]);

  // Start simulation
  const start = useCallback(() => {
    if (routePoints.length < 2) {
      console.warn('Need at least 2 route points to simulate');
      return;
    }

    currentIndexRef.current = 0;
    lastTimeRef.current = 0;

    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      currentLocation: routePoints[0],
      progress: 0,
    }));

    onLocationUpdate?.(routePoints[0]);
    animationRef.current = requestAnimationFrame(animate);
  }, [routePoints, onLocationUpdate, animate]);

  // Pause simulation
  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  // Resume simulation
  const resume = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }));
    if (state.isRunning) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [state.isRunning, animate]);

  // Stop simulation
  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setState({
      isRunning: false,
      currentLocation: null,
      progress: 0,
      speed: 'normal',
      isPaused: false,
    });
    currentIndexRef.current = 0;
  }, []);

  // Set simulation speed
  const setSpeed = useCallback((speed: 'slow' | 'normal' | 'fast') => {
    setState(prev => ({ ...prev, speed }));
  }, []);

  // Jump to specific progress point
  const jumpTo = useCallback((progress: number) => {
    const targetIndex = Math.floor((progress / 100) * (routePoints.length - 1));
    currentIndexRef.current = targetIndex;
    const location = routePoints[targetIndex];
    setState(prev => ({
      ...prev,
      currentLocation: location,
      progress,
    }));
    onLocationUpdate?.(location);
  }, [routePoints, onLocationUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Restart animation when running state changes
  useEffect(() => {
    if (state.isRunning && !state.isPaused && !animationRef.current) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [state.isRunning, state.isPaused, animate]);

  return {
    ...state,
    start,
    pause,
    resume,
    stop,
    setSpeed,
    jumpTo,
  };
}

/**
 * Decode polyline to array of coordinates for simulation
 */
export function decodePolylineToPoints(encoded: string): Coordinates[] {
  const points: Coordinates[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
