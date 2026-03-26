import { useState, useEffect } from 'react';
import { Navigation, MapPin, X, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { openNavTo, getSavedNav, dismissNavBanner, isNavBannerDismissed, type NavTarget } from '@/lib/navigation';

interface NavigationCardProps {
  tripId: string;
  status: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  pickupAddress?: string;
  dropoffAddress?: string;
}

/**
 * Shows a navigate button + resume banner for active trips.
 * Used on both /ride-detail and /driver dashboard.
 */
export default function NavigationCard({
  tripId,
  status,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  pickupAddress,
  dropoffAddress,
}: NavigationCardProps) {
  const [overrideTarget, setOverrideTarget] = useState<NavTarget | null>(null);
  const [overrideTimer, setOverrideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showResume, setShowResume] = useState(false);

  // Determine default target based on status
  const isPickupPhase = ['accepted', 'enroute_pickup'].includes(status);
  const defaultTarget: NavTarget = isPickupPhase ? 'pickup' : 'dropoff';
  const activeTarget = overrideTarget ?? defaultTarget;

  const targetLat = activeTarget === 'pickup' ? pickupLat : dropoffLat;
  const targetLng = activeTarget === 'pickup' ? pickupLng : dropoffLng;

  // Check for resume banner
  useEffect(() => {
    const saved = getSavedNav();
    if (saved && saved.tripId === tripId && !isNavBannerDismissed()) {
      setShowResume(true);
    } else {
      setShowResume(false);
    }
  }, [tripId]);

  const handleNavigate = () => {
    openNavTo(targetLat, targetLng, tripId, activeTarget);
  };

  const handleSwitchTarget = () => {
    const switched: NavTarget = activeTarget === 'pickup' ? 'dropoff' : 'pickup';
    setOverrideTarget(switched);
    if (overrideTimer) clearTimeout(overrideTimer);
    const timer = setTimeout(() => {
      setOverrideTarget(null);
    }, 10000);
    setOverrideTimer(timer);
  };

  const handleResume = () => {
    const saved = getSavedNav();
    if (saved) {
      openNavTo(saved.lat, saved.lng, saved.tripId, saved.target);
    }
    setShowResume(false);
  };

  const handleDismissResume = () => {
    dismissNavBanner();
    setShowResume(false);
  };

  const buttonLabel = activeTarget === 'pickup' ? 'Navigate to Pickup' : 'Navigate to Dropoff';
  const buttonIcon = activeTarget === 'pickup' ? <MapPin className="h-5 w-5" /> : <Navigation className="h-5 w-5" />;

  // Only show for active statuses
  const activeStatuses = ['accepted', 'enroute_pickup', 'arrived', 'in_progress'];
  if (!activeStatuses.includes(status)) return null;

  return (
    <div className="space-y-2">
      {/* Resume Banner */}
      {showResume && (
        <div className="flex items-center gap-3 bg-accent/15 border border-accent/30 rounded-2xl px-4 py-3">
          <RotateCcw className="h-5 w-5 text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Resume navigation?</p>
          </div>
          <Button size="sm" variant="accent" onClick={handleResume} className="shrink-0">
            Resume
          </Button>
          <button onClick={handleDismissResume} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Card */}
      <Card className="border-primary/30 bg-primary/5 overflow-hidden">
        {/* Blue top bar */}
        <div className="px-4 py-1.5 text-center text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary">
          Active Trip Navigation
        </div>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="h-4 w-4 text-primary" />
            <p className="font-bold text-sm">Active Trip Navigation</p>
          </div>

          {pickupAddress && dropoffAddress && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="truncate"><span className="font-medium text-foreground">Pickup:</span> {pickupAddress}</p>
              <p className="truncate"><span className="font-medium text-foreground">Drop-off:</span> {dropoffAddress}</p>
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleNavigate}>
            {buttonIcon}
            <span className="ml-2">{buttonLabel}</span>
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Voice guidance will play in your Maps app.
          </p>

          <button
            onClick={handleSwitchTarget}
            className="w-full text-xs text-primary font-medium py-1 hover:underline"
          >
            Switch to {activeTarget === 'pickup' ? 'dropoff' : 'pickup'}
            {overrideTarget && ' (reverts in 10s)'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
