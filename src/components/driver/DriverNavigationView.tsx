// Driver Navigation View - Turn-by-turn voice instructions with OSRM
import { useState, useEffect, useCallback } from 'react';
import { 
  Navigation, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  ArrowUp, 
  RotateCcw,
  Flag,
  CornerUpLeft,
  CornerUpRight,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Coordinates } from '@/lib/osrm';
import { 
  getDetailedRoute, 
  getVoiceInstruction, 
  getManeuverInstruction,
  findCurrentStep,
  type RouteStep,
  type DetailedRoute
} from '@/lib/osrmSteps';
import { useVoiceNavigation } from '@/hooks/useVoiceNavigation';
import { useArrivalDetection, formatArrivalDistance } from '@/hooks/useArrivalDetection';

interface DriverNavigationViewProps {
  driverLocation: Coordinates | null;
  pickupLocation: Coordinates | null;
  dropoffLocation: Coordinates | null;
  tripPhase: 'to_pickup' | 'to_dropoff';
  onArrivedAtPickup?: () => void;
  onArrivedAtDropoff?: () => void;
  className?: string;
}

export default function DriverNavigationView({
  driverLocation,
  pickupLocation,
  dropoffLocation,
  tripPhase,
  onArrivedAtPickup,
  onArrivedAtDropoff,
  className,
}: DriverNavigationViewProps) {
  const [route, setRoute] = useState<DetailedRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNext, setDistanceToNext] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastSpokenStep, setLastSpokenStep] = useState(-1);

  const destination = tripPhase === 'to_pickup' ? pickupLocation : dropoffLocation;

  const { 
    speak, 
    stop: stopVoice, 
    isSpeaking, 
    isSupported: voiceSupported,
    lastInstruction 
  } = useVoiceNavigation({ enabled: voiceEnabled });

  // Arrival detection
  const arrivalState = useArrivalDetection({
    driverLocation,
    pickupLocation: tripPhase === 'to_pickup' ? pickupLocation : null,
    dropoffLocation: tripPhase === 'to_dropoff' ? dropoffLocation : null,
    enableVoice: voiceEnabled,
    onArrivedAtPickup,
    onArrivedAtDropoff,
  });

  // Fetch detailed route when destination changes
  useEffect(() => {
    if (!driverLocation || !destination) {
      setRoute(null);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      try {
        const detailedRoute = await getDetailedRoute(driverLocation, destination);
        setRoute(detailedRoute);
        setCurrentStepIndex(0);
        setLastSpokenStep(-1);
      } catch (error) {
        console.error('Failed to fetch detailed route:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [destination?.lat, destination?.lng]);

  // Update current step based on driver location
  useEffect(() => {
    if (!route?.steps || !driverLocation) return;

    const { stepIndex, distanceToNextManeuver } = findCurrentStep(
      route.steps,
      driverLocation
    );

    setCurrentStepIndex(stepIndex);
    setDistanceToNext(distanceToNextManeuver);

    // Voice announcement for new step
    if (voiceEnabled && stepIndex !== lastSpokenStep && stepIndex < route.steps.length) {
      const step = route.steps[stepIndex];
      const instruction = getVoiceInstruction(step, distanceToNextManeuver);
      speak(instruction);
      setLastSpokenStep(stepIndex);
    }
  }, [driverLocation, route?.steps, voiceEnabled, lastSpokenStep, speak]);

  // Get current and next step
  const currentStep = route?.steps?.[currentStepIndex];
  const nextStep = route?.steps?.[currentStepIndex + 1];

  // Manual voice replay
  const replayInstruction = useCallback(() => {
    if (currentStep) {
      const instruction = getVoiceInstruction(currentStep, distanceToNext);
      speak(instruction, true);
    }
  }, [currentStep, distanceToNext, speak]);

  // Get maneuver icon
  const getStepIcon = (step: RouteStep) => {
    const modifier = step.maneuver.modifier;
    
    if (step.maneuver.type === 'arrive') {
      return <Flag className="w-8 h-8" />;
    }
    if (modifier?.includes('left')) {
      return <CornerUpLeft className="w-8 h-8" />;
    }
    if (modifier?.includes('right')) {
      return <CornerUpRight className="w-8 h-8" />;
    }
    return <ArrowUp className="w-8 h-8" />;
  };

  // Progress through route
  const routeProgress = route?.steps 
    ? Math.round((currentStepIndex / route.steps.length) * 100)
    : 0;

  if (!destination) {
    return (
      <Card className={cn("bg-card", className)}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Navigation className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No destination set</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-card overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Navigation className="w-5 h-5 text-accent" />
            {tripPhase === 'to_pickup' ? 'To Pickup' : 'To Destination'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={cn(
                "h-8 w-8",
                !voiceEnabled && "text-muted-foreground"
              )}
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>
            {voiceEnabled && currentStep && (
              <Button
                variant="ghost"
                size="icon"
                onClick={replayInstruction}
                disabled={isSpeaking}
                className="h-8 w-8"
              >
                <RotateCcw className={cn("w-4 h-4", isSpeaking && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <Progress value={routeProgress} className="h-1.5 mt-2" />
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-accent" />
            <p className="text-sm text-muted-foreground">Calculating route...</p>
          </div>
        ) : arrivalState.isArrived ? (
          // Arrived state
          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <Flag className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold text-emerald-600">You Have Arrived!</h3>
            <p className="text-muted-foreground mt-1">
              {tripPhase === 'to_pickup' 
                ? 'Rider is waiting for you'
                : 'Trip completed successfully'
              }
            </p>
          </div>
        ) : currentStep ? (
          <>
            {/* Current instruction - large display */}
            <div className="bg-accent/10 rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 text-accent">
                  {getStepIcon(currentStep)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold leading-tight">
                    {distanceToNext > 50 
                      ? `In ${distanceToNext >= 1000 
                          ? `${(distanceToNext / 1000).toFixed(1)}km`
                          : `${Math.round(distanceToNext / 10) * 10}m`
                        }`
                      : 'Now'
                    }
                  </p>
                  <p className="text-lg text-foreground/80 mt-1">
                    {getManeuverInstruction(currentStep)}
                  </p>
                </div>
              </div>
            </div>

            {/* Voice status */}
            {!voiceSupported && voiceEnabled && (
              <div className="text-sm text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                Voice not supported - showing text instructions
              </div>
            )}

            {/* Last spoken instruction (text fallback) */}
            {lastInstruction && !voiceSupported && (
              <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                🔊 {lastInstruction}
              </div>
            )}

            {/* Next step preview */}
            {nextStep && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                  {getStepIcon(nextStep)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Then</p>
                  <p className="text-sm font-medium truncate">
                    {getManeuverInstruction(nextStep)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            )}

            {/* Route summary */}
            {route && (
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
                <span>{route.distanceKm} km remaining</span>
                <span>~{route.durationMinutes} min</span>
              </div>
            )}
          </>
        ) : (
          // No route available - fallback
          <div className="py-6 text-center">
            <p className="text-muted-foreground">
              {tripPhase === 'to_pickup' 
                ? formatArrivalDistance(arrivalState.distanceToPickup)
                : formatArrivalDistance(arrivalState.distanceToDropoff)
              }
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Drive towards destination
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
