// Pilot Testing Mode - Simulate driver movement for testing arrival detection & voice navigation
import { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  FastForward, 
  Rewind,
  TestTube,
  MapPin,
  Navigation,
  Car,
  Volume2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Coordinates } from '@/lib/osrm';
import { useDriverSimulation, decodePolylineToPoints } from '@/hooks/useDriverSimulation';
import { useOSRMRoute } from '@/hooks/useOSRMRoute';
import DriverNavigationView from './DriverNavigationView';
import MapGoogle from '@/components/MapGoogle';
import ArrivalIndicator from '@/components/ArrivalIndicator';
import { useArrivalDetection } from '@/hooks/useArrivalDetection';

// Test scenarios for Gwanda
const TEST_SCENARIOS = [
  {
    id: 'cbd-to-phakama',
    name: 'CBD → Phakama',
    pickup: { lat: -20.9389, lng: 29.0147, name: 'Gwanda CBD' },
    dropoff: { lat: -20.9512, lng: 29.0234, name: 'Phakama Shops' },
  },
  {
    id: 'rank-to-hospital',
    name: 'Rank → Hospital',
    pickup: { lat: -20.9395, lng: 29.0152, name: 'Gwanda Rank' },
    dropoff: { lat: -20.9356, lng: 29.0089, name: 'Gwanda Hospital' },
  },
  {
    id: 'geneva-to-cbd',
    name: 'Geneva → CBD',
    pickup: { lat: -20.9478, lng: 29.0298, name: 'Geneva Shops' },
    dropoff: { lat: -20.9389, lng: 29.0147, name: 'Gwanda CBD' },
  },
];

interface PilotTestingModeProps {
  className?: string;
}

export default function PilotTestingMode({ className }: PilotTestingModeProps) {
  const [activeScenario, setActiveScenario] = useState(TEST_SCENARIOS[0]);
  const [tripPhase, setTripPhase] = useState<'to_pickup' | 'to_dropoff'>('to_pickup');
  const [simulatedLocation, setSimulatedLocation] = useState<Coordinates | null>(null);
  const [testLog, setTestLog] = useState<string[]>([]);

  // Get the actual start/end based on trip phase
  const startPoint = tripPhase === 'to_pickup' 
    ? { lat: activeScenario.pickup.lat - 0.005, lng: activeScenario.pickup.lng - 0.003 } // Simulate driver starting nearby
    : activeScenario.pickup;
  const endPoint = tripPhase === 'to_pickup' 
    ? activeScenario.pickup 
    : activeScenario.dropoff;

  // Get route for simulation
  const { route, loading: routeLoading } = useOSRMRoute(startPoint, endPoint);

  // Decode route to points for simulation
  const routePoints = route?.geometry 
    ? decodePolylineToPoints(route.geometry)
    : [startPoint, endPoint];

  // Log helper
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  }, []);

  // Driver simulation
  const simulation = useDriverSimulation({
    routePoints,
    onLocationUpdate: (location) => {
      setSimulatedLocation(location);
    },
    onComplete: () => {
      addLog(`✅ Simulation complete - Arrived at ${tripPhase === 'to_pickup' ? 'pickup' : 'dropoff'}`);
      
      // Auto-switch to dropoff phase after pickup
      if (tripPhase === 'to_pickup') {
        setTimeout(() => {
          setTripPhase('to_dropoff');
          addLog('📍 Phase switched to: to_dropoff');
        }, 2000);
      }
    },
  });

  // Arrival detection using simulated location
  const arrivalState = useArrivalDetection({
    driverLocation: simulatedLocation,
    pickupLocation: tripPhase === 'to_pickup' ? activeScenario.pickup : null,
    dropoffLocation: tripPhase === 'to_dropoff' ? activeScenario.dropoff : null,
    enableVoice: true,
    onArrivedAtPickup: () => {
      addLog('🚗 ARRIVED at pickup! Notification sent.');
    },
    onArrivedAtDropoff: () => {
      addLog('🎉 ARRIVED at destination! Trip complete.');
    },
  });

  // Log location updates
  useEffect(() => {
    if (simulatedLocation && simulation.isRunning) {
      const distance = tripPhase === 'to_pickup' 
        ? arrivalState.distanceToPickup 
        : arrivalState.distanceToDropoff;
      
      if (distance !== null && distance < 200) {
        addLog(`📍 Distance to target: ${Math.round(distance)}m`);
      }
    }
  }, [simulatedLocation, arrivalState.distanceToPickup, arrivalState.distanceToDropoff]);

  // Handle scenario change
  const handleScenarioChange = (scenario: typeof TEST_SCENARIOS[0]) => {
    simulation.stop();
    setActiveScenario(scenario);
    setTripPhase('to_pickup');
    setSimulatedLocation(null);
    addLog(`📋 Loaded scenario: ${scenario.name}`);
  };

  // Handle phase toggle
  const handlePhaseToggle = (phase: 'to_pickup' | 'to_dropoff') => {
    simulation.stop();
    setTripPhase(phase);
    setSimulatedLocation(null);
    addLog(`📍 Phase set to: ${phase}`);
  };

  return (
    <div className={cn("grid gap-6 lg:grid-cols-2", className)}>
      {/* Left Column - Controls & Map */}
      <div className="space-y-4">
        {/* Header Card */}
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TestTube className="w-5 h-5 text-amber-500" />
              Pilot Testing Mode
            </CardTitle>
            <CardDescription>
              Simulate driver movement to test arrival detection and voice navigation
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Scenario Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Test Scenario</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {TEST_SCENARIOS.map((scenario) => (
                <Button
                  key={scenario.id}
                  variant={activeScenario.id === scenario.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleScenarioChange(scenario)}
                  disabled={simulation.isRunning}
                >
                  {scenario.name}
                </Button>
              ))}
            </div>

            {/* Phase Toggle */}
            <div className="mt-4">
              <Tabs value={tripPhase} onValueChange={(v) => handlePhaseToggle(v as typeof tripPhase)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="to_pickup" disabled={simulation.isRunning}>
                    <Car className="w-4 h-4 mr-1.5" />
                    To Pickup
                  </TabsTrigger>
                  <TabsTrigger value="to_dropoff" disabled={simulation.isRunning}>
                    <MapPin className="w-4 h-4 mr-1.5" />
                    To Dropoff
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Map View */}
        <Card>
          <CardContent className="p-0">
            <MapGoogle
              pickup={tripPhase === 'to_pickup' ? activeScenario.pickup : activeScenario.pickup}
              dropoff={tripPhase === 'to_pickup' ? null : activeScenario.dropoff}
              driverLocation={simulatedLocation}
              routeGeometry={route?.geometry}
              height="300px"
            />
          </CardContent>
        </Card>

        {/* Simulation Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Simulation Controls
              {simulation.isRunning && (
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-600">
                  Running
                </Badge>
              )}
              {simulation.isPaused && (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
                  Paused
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Playback buttons */}
            <div className="flex items-center gap-2">
              {!simulation.isRunning ? (
                <Button onClick={simulation.start} disabled={routeLoading} className="flex-1">
                  <Play className="w-4 h-4 mr-1.5" />
                  Start Simulation
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={simulation.isPaused ? simulation.resume : simulation.pause}
                  >
                    {simulation.isPaused ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="icon" onClick={simulation.stop}>
                    <Square className="w-4 h-4" />
                  </Button>
                </>
              )}

              {/* Speed controls */}
              {simulation.isRunning && (
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    variant={simulation.speed === 'slow' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => simulation.setSpeed('slow')}
                  >
                    <Rewind className="w-3 h-3" />
                  </Button>
                  <Button
                    variant={simulation.speed === 'normal' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => simulation.setSpeed('normal')}
                  >
                    1x
                  </Button>
                  <Button
                    variant={simulation.speed === 'fast' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => simulation.setSpeed('fast')}
                  >
                    <FastForward className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Progress slider */}
            {simulation.isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(simulation.progress)}%</span>
                </div>
                <Slider
                  value={[simulation.progress]}
                  onValueChange={([v]) => simulation.jumpTo(v)}
                  max={100}
                  step={1}
                  disabled={!simulation.isPaused}
                />
              </div>
            )}

            {/* Current location */}
            {simulatedLocation && (
              <div className="text-xs text-muted-foreground font-mono bg-secondary/50 rounded px-2 py-1">
                📍 {simulatedLocation.lat.toFixed(5)}, {simulatedLocation.lng.toFixed(5)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Navigation & Logs */}
      <div className="space-y-4">
        {/* Arrival Status */}
        <ArrivalIndicator
          isArrived={arrivalState.isArrived}
          arrivalType={arrivalState.arrivalType}
          distanceToPickup={arrivalState.distanceToPickup}
          distanceToDropoff={arrivalState.distanceToDropoff}
        />

        {/* Driver Navigation View */}
        <DriverNavigationView
          driverLocation={simulatedLocation}
          pickupLocation={activeScenario.pickup}
          dropoffLocation={activeScenario.dropoff}
          tripPhase={tripPhase}
          onArrivedAtPickup={() => addLog('🔔 onArrivedAtPickup callback fired')}
          onArrivedAtDropoff={() => addLog('🔔 onArrivedAtDropoff callback fired')}
        />

        {/* Test Log */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Test Log
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48 overflow-y-auto rounded-lg bg-secondary/30 p-2 text-xs font-mono space-y-1">
              {testLog.length === 0 ? (
                <p className="text-muted-foreground">Start simulation to see events...</p>
              ) : (
                testLog.map((log, i) => (
                  <div key={i} className="text-muted-foreground">{log}</div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
