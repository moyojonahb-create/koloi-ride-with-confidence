import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOSRMRoute } from '@/hooks/useOSRMRoute';
import { usePricingSettings } from '@/hooks/usePricingSettings';
import { useLandmarks } from '@/hooks/useLandmarks';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Menu, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import OSMMap from '@/components/OSMMap';
import RideBottomSheet, { type SheetState } from './RideBottomSheet';
import RideStatusBanner, { type RideStatus } from './RideStatusBanner';
import RideInputs from './RideInputs';
import FareEstimate from './FareEstimate';
import OffersModal, { type DriverViewing, type DriverOffer } from '@/components/OffersModal';
import AuthModalWrapper from '@/components/auth/AuthModalWrapper';
import InstallPromptBanner from '@/components/InstallPromptBanner';

interface SelectedLocation {
  name: string;
  lat: number;
  lng: number;
}

interface GPSState {
  status: 'idle' | 'loading' | 'success' | 'denied' | 'unavailable';
  coords: { lat: number; lng: number } | null;
  error: string | null;
}

export default function RideView() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: pricingSettings } = usePricingSettings();
  const { findNearestLandmark } = useLandmarks({});

  // Sheet state
  const [sheetState, setSheetState] = useState<SheetState>('half');

  // Location state
  const [pickupLocation, setPickupLocation] = useState<SelectedLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<SelectedLocation | null>(null);
  const [gpsState, setGpsState] = useState<GPSState>({ status: 'idle', coords: null, error: null });

  // Ride state
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  const [isRequesting, setIsRequesting] = useState(false);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);

  // Offers modal
  const [offersOpen, setOffersOpen] = useState(false);
  const [viewingDrivers, setViewingDrivers] = useState<DriverViewing[]>([]);
  const [offers, setOffers] = useState<DriverOffer[]>([]);

  // Auth modal
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Route calculation
  const { route: routeData, loading: routeLoading } = useOSRMRoute(
    pickupLocation ? { lat: pickupLocation.lat, lng: pickupLocation.lng } : null,
    dropoffLocation ? { lat: dropoffLocation.lat, lng: dropoffLocation.lng } : null
  );

  // Calculate fare
  const calculateFare = useCallback(() => {
    if (!routeData?.distanceKm || !pricingSettings) return null;

    const distanceKm = routeData.distanceKm;
    const durationMinutes = routeData.durationMinutes;
    
    const baseFare = pricingSettings.base_fare;
    const perKmRate = pricingSettings.per_km_rate;
    const minFare = pricingSettings.min_fare;
    
    let fare = baseFare + (distanceKm * perKmRate);
    fare = Math.max(fare, minFare);

    return {
      fareR: Math.round(fare * 100) / 100,
      distanceKm,
      durationMinutes,
    };
  }, [routeData, pricingSettings]);

  const fareEstimate = calculateFare();

  // Handle GPS location
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState({ status: 'unavailable', coords: null, error: 'Geolocation not supported' });
      return;
    }

    setGpsState(prev => ({ ...prev, status: 'loading', error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setGpsState({ status: 'success', coords, error: null });

        const nearest = findNearestLandmark(coords.lat, coords.lng);
        const name = nearest && nearest.distance && nearest.distance < 0.3
          ? `Near ${nearest.name}`
          : 'My Location';

        setPickupLocation({ name, lat: coords.lat, lng: coords.lng });
      },
      (error) => {
        let errorMessage = 'Unable to get location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location access denied';
        }
        setGpsState({ status: 'denied', coords: null, error: errorMessage });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [findNearestLandmark]);

  // Handle map click
  const handleMapClick = useCallback((coords: { lat: number; lng: number }) => {
    const nearest = findNearestLandmark(coords.lat, coords.lng);
    const name = nearest && nearest.distance && nearest.distance < 0.5
      ? `Near ${nearest.name}`
      : `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

    if (!pickupLocation) {
      setPickupLocation({ name, lat: coords.lat, lng: coords.lng });
    } else if (!dropoffLocation) {
      setDropoffLocation({ name, lat: coords.lat, lng: coords.lng });
    }
  }, [pickupLocation, dropoffLocation, findNearestLandmark]);

  // Request ride
  const handleRequestRide = async () => {
    if (!user) {
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }

    if (!pickupLocation || !dropoffLocation || !fareEstimate) {
      toast({ title: 'Select pickup and destination', variant: 'destructive' });
      return;
    }

    setIsRequesting(true);
    setRideStatus('searching');

    try {
      const { data, error } = await supabase.from('rides').insert({
        user_id: user.id,
        pickup_address: pickupLocation.name,
        pickup_lat: pickupLocation.lat,
        pickup_lon: pickupLocation.lng,
        dropoff_address: dropoffLocation.name,
        dropoff_lat: dropoffLocation.lat,
        dropoff_lon: dropoffLocation.lng,
        distance_km: fareEstimate.distanceKm,
        duration_minutes: fareEstimate.durationMinutes,
        fare: fareEstimate.fareR,
        route_polyline: routeData?.geometry || null,
        status: 'pending',
      }).select().single();

      if (error) throw error;

      setCurrentRideId(data.id);
      toast({ title: 'Ride requested!', description: 'Looking for nearby drivers...' });
      
      // Simulate offers for demo
      setTimeout(() => {
        setRideStatus('offers_received');
        setOffers([{
          offerId: 'offer-1',
          driverId: 'driver-1',
          name: 'John M.',
          phone: '+263 77 123 4567',
          vehicleType: 'Car',
          plateNumber: 'ABC 1234',
          languages: ['English', 'Ndebele'],
          distanceKm: 1.2,
          etaMinutes: 4,
          offeredFareR: fareEstimate.fareR,
          createdAt: new Date().toISOString(),
        }]);
        setOffersOpen(true);
      }, 3000);

    } catch (error: any) {
      toast({ title: 'Failed to request ride', description: error.message, variant: 'destructive' });
      setRideStatus('idle');
    } finally {
      setIsRequesting(false);
    }
  };

  // Accept offer
  const handleAcceptOffer = async (offerId: string) => {
    setRideStatus('driver_assigned');
    setOffersOpen(false);
    toast({ title: 'Driver accepted!', description: 'Your driver is on the way' });
    setTimeout(() => setRideStatus('driver_arriving'), 2000);
  };

  // Decline offer
  const handleDeclineOffer = async (offerId: string) => {
    setOffers(prev => prev.filter(o => o.offerId !== offerId));
    if (offers.length <= 1) {
      setRideStatus('searching');
    }
  };

  // Cancel ride
  const handleCancelRide = async () => {
    if (currentRideId) {
      await supabase.from('rides').update({ status: 'cancelled' }).eq('id', currentRideId);
    }
    setRideStatus('idle');
    setCurrentRideId(null);
    setOffers([]);
    setViewingDrivers([]);
    toast({ title: 'Ride cancelled' });
  };

  const canRequestRide = pickupLocation && dropoffLocation && fareEstimate && !isRequesting;

  // Collapsed content for sheet
  const collapsedContent = (
    <div className="space-y-2">
      {pickupLocation && dropoffLocation && fareEstimate ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg">R {fareEstimate.fareR.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              {pickupLocation.name} → {dropoffLocation.name}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground">Tap to enter your destination</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Install Prompt Banner */}
      <InstallPromptBanner />
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 safe-area-top">
        <div className="flex items-center justify-between p-4">
          <Button variant="secondary" size="icon" className="w-12 h-12 rounded-full shadow-lg">
            <Menu className="w-5 h-5" />
          </Button>
          
          {/* Status Banner */}
          <RideStatusBanner
            status={rideStatus}
            offersCount={offers.length}
            className="flex-1 mx-3"
          />

          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 rounded-full shadow-lg"
            onClick={() => user ? navigate('/dashboard') : setAuthModalOpen(true)}
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Full-screen Map */}
      <div className="flex-1">
        <OSMMap
          pickup={pickupLocation}
          dropoff={dropoffLocation}
          routeGeometry={routeData?.geometry}
          onMapClick={handleMapClick}
          height="100%"
          className="w-full h-full"
          showRecenterButton
        />
      </div>

      {/* Bottom Sheet */}
      <RideBottomSheet
        state={sheetState}
        onStateChange={setSheetState}
        collapsedContent={collapsedContent}
      >
        <div className="space-y-4 pb-24">
          {/* Ride Inputs */}
          <RideInputs
            pickupLocation={pickupLocation}
            dropoffLocation={dropoffLocation}
            onPickupSelect={setPickupLocation}
            onDropoffSelect={setDropoffLocation}
            onUseMyLocation={handleUseMyLocation}
            isGettingLocation={gpsState.status === 'loading'}
            gpsError={gpsState.error}
          />

          {/* Fare Estimate */}
          {fareEstimate && (
            <FareEstimate
              fareR={fareEstimate.fareR}
              distanceKm={fareEstimate.distanceKm}
              durationMinutes={fareEstimate.durationMinutes}
            />
          )}

          {routeLoading && pickupLocation && dropoffLocation && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Calculating route...
            </div>
          )}
        </div>
      </RideBottomSheet>

      {/* Fixed Request Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-50 safe-area-bottom">
        <Button
          onClick={handleRequestRide}
          disabled={!canRequestRide}
          size="lg"
          className={cn(
            'w-full h-14 text-lg font-bold rounded-xl shadow-lg',
            canRequestRide
              ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Finding drivers...
            </>
          ) : !user ? (
            'Sign in to request ride'
          ) : (
            `Request Ride${fareEstimate ? ` • R ${fareEstimate.fareR.toFixed(2)}` : ''}`
          )}
        </Button>
      </div>

      {/* Offers Modal */}
      <OffersModal
        isOpen={offersOpen}
        tripId={currentRideId || ''}
        viewing={viewingDrivers}
        offers={offers}
        onAcceptOffer={handleAcceptOffer}
        onDeclineOffer={handleDeclineOffer}
        onCancelRide={handleCancelRide}
        onClose={() => setOffersOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModalWrapper
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')}
      />
    </div>
  );
}
