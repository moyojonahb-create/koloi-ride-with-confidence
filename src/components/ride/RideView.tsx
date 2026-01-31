import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOSRMRoute } from '@/hooks/useOSRMRoute';
import { usePricingSettings } from '@/hooks/usePricingSettings';
import { useLandmarks } from '@/hooks/useLandmarks';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Navigation, Crosshair, ArrowRight, Menu, User, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import OSMMap from '@/components/OSMMap';
import RideStatusBanner, { type RideStatus } from './RideStatusBanner';
import OffersModal, { type DriverViewing, type DriverOffer } from '@/components/OffersModal';
import AuthModalWrapper from '@/components/auth/AuthModalWrapper';
import InstallPromptBanner from '@/components/InstallPromptBanner';
import KoloiLogo from '@/components/KoloiLogo';
import QuickPickChips from './QuickPickChips';
import { Input } from '@/components/ui/input';
import { useLandmarks as useLandmarksSearch, type Landmark } from '@/hooks/useLandmarks';

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

  // Location state
  const [pickupLocation, setPickupLocation] = useState<SelectedLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<SelectedLocation | null>(null);
  const [gpsState, setGpsState] = useState<GPSState>({ status: 'idle', coords: null, error: null });
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Search landmarks
  const { landmarks, loading: landmarksLoading } = useLandmarksSearch({
    searchQuery,
    limit: 6,
  });

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
        setActiveField(null);
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

  // Handle landmark selection
  const handleLandmarkSelect = (landmark: Landmark) => {
    const location: SelectedLocation = {
      name: landmark.name,
      lat: landmark.latitude,
      lng: landmark.longitude,
    };

    if (activeField === 'pickup') {
      setPickupLocation(location);
    } else {
      setDropoffLocation(location);
    }
    setActiveField(null);
    setSearchQuery('');
  };

  // Handle quick pick
  const handleQuickPickSelect = (pick: { name: string; lat: number; lng: number }) => {
    const location: SelectedLocation = { name: pick.name, lat: pick.lat, lng: pick.lng };

    if (activeField === 'pickup') {
      setPickupLocation(location);
      setActiveField(null);
    } else if (activeField === 'dropoff') {
      setDropoffLocation(location);
      setActiveField(null);
    }
  };

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

  // Accept/Decline offer handlers
  const handleAcceptOffer = async (offerId: string) => {
    setRideStatus('driver_assigned');
    setOffersOpen(false);
    toast({ title: 'Driver accepted!', description: 'Your driver is on the way' });
    setTimeout(() => setRideStatus('driver_arriving'), 2000);
  };

  const handleDeclineOffer = async (offerId: string) => {
    setOffers(prev => prev.filter(o => o.offerId !== offerId));
    if (offers.length <= 1) setRideStatus('searching');
  };

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

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <InstallPromptBanner />
      
      {/* Header */}
      <header className="flex items-center justify-between p-4 safe-area-top">
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-10 h-10 rounded-full text-primary-foreground hover:bg-primary-foreground/10"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <KoloiLogo variant="light" size="sm" />

        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full text-primary-foreground hover:bg-primary-foreground/10"
          onClick={() => user ? navigate('/dashboard') : setAuthModalOpen(true)}
        >
          <User className="w-5 h-5" />
        </Button>
      </header>

      {/* Status Banner */}
      {rideStatus !== 'idle' && (
        <div className="px-4 pb-2">
          <RideStatusBanner status={rideStatus} offersCount={offers.length} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 pb-4">
        {/* Map Frame */}
        <div className="bg-koloi-gray-200 rounded-3xl overflow-hidden shadow-koloi-lg flex-1 min-h-[200px] max-h-[45vh] relative">
          <OSMMap
            pickup={pickupLocation}
            dropoff={dropoffLocation}
            routeGeometry={routeData?.geometry}
            height="100%"
            className="w-full h-full"
            showRecenterButton
          />
          
          {/* Loading overlay */}
          {routeLoading && pickupLocation && dropoffLocation && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-full shadow-koloi-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Calculating route...</span>
              </div>
            </div>
          )}
        </div>

        {/* Ride Card - inDrive Style */}
        <div className="bg-koloi-gray-100 rounded-t-[2rem] shadow-koloi-xl -mt-8 relative z-10 pt-3 pb-6 px-5 flex flex-col">
          {/* Handle Bar */}
          <div className="w-10 h-1 bg-koloi-gray-400 rounded-full mx-auto mb-4" />

          {/* Location Inputs - Minimal inDrive style */}
          <div className="bg-background rounded-2xl shadow-koloi-sm overflow-hidden mb-4">
            {/* Pickup Row */}
            <div
              onClick={() => setActiveField(activeField === 'pickup' ? null : 'pickup')}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-koloi-gray-100/50 transition-colors cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActiveField(activeField === 'pickup' ? null : 'pickup')}
            >
              <div className={cn(
                'w-3 h-3 rounded-full shrink-0',
                pickupLocation ? 'bg-accent' : 'bg-koloi-gray-400'
              )} />
              <p className={cn(
                'flex-1 text-base font-medium truncate',
                pickupLocation ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {pickupLocation?.name || 'From where?'}
              </p>
              {pickupLocation && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPickupLocation(null); setActiveField('pickup'); }}
                  className="p-1.5 hover:bg-koloi-gray-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Divider with connector */}
            <div className="flex items-center px-4">
              <div className="w-3 flex justify-center">
                <div className="w-px h-4 bg-koloi-gray-300" />
              </div>
              <div className="flex-1 h-px bg-koloi-gray-200 ml-3" />
            </div>

            {/* Dropoff Row */}
            <div
              onClick={() => setActiveField(activeField === 'dropoff' ? null : 'dropoff')}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-koloi-gray-100/50 transition-colors cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActiveField(activeField === 'dropoff' ? null : 'dropoff')}
            >
              <div className={cn(
                'w-3 h-3 rounded-full shrink-0',
                dropoffLocation ? 'bg-primary' : 'bg-koloi-gray-400'
              )} />
              <p className={cn(
                'flex-1 text-base font-medium truncate',
                dropoffLocation ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {dropoffLocation?.name || 'Where to?'}
              </p>
              {dropoffLocation && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDropoffLocation(null); setActiveField('dropoff'); }}
                  className="p-1.5 hover:bg-koloi-gray-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Expanded Selection Panel - inDrive style with yellow accent */}
          {activeField && (
            <div className="space-y-4 animate-fade-in">
              {/* Search Input - Yellow/Accent background like inDrive */}
              <div className="bg-accent/10 rounded-2xl p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent" />
                  <Input
                    placeholder={activeField === 'pickup' ? 'Search pickup location...' : 'Search destination...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-14 bg-background border-0 rounded-xl text-base font-medium shadow-koloi-sm focus-visible:ring-accent"
                    autoFocus
                  />
                </div>

                {/* My Location Button (only for pickup) */}
                {activeField === 'pickup' && (
                  <button
                    onClick={handleUseMyLocation}
                    disabled={gpsState.status === 'loading'}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-background hover:bg-koloi-gray-100 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                      {gpsState.status === 'loading' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-accent-foreground" />
                      ) : (
                        <Crosshair className="w-5 h-5 text-accent-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Use my current location</p>
                      <p className="text-sm text-muted-foreground">Find pickup point automatically</p>
                    </div>
                  </button>
                )}

                {gpsState.error && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">{gpsState.error}</p>
                )}
              </div>

              {/* Quick Picks - Horizontal scroll */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  Popular places
                </p>
                <QuickPickChips
                  onSelect={handleQuickPickSelect}
                  selectedName={activeField === 'pickup' ? pickupLocation?.name : dropoffLocation?.name}
                />
              </div>

              {/* Search Results - inDrive place listing style */}
              {searchQuery.trim() && (
                <div className="bg-background rounded-2xl shadow-koloi-sm overflow-hidden">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-4 pb-2">
                    Search results
                  </p>
                  <div className="max-h-[200px] overflow-y-auto">
                    {landmarksLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                      </div>
                    ) : landmarks.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No places found</p>
                    ) : (
                      landmarks.map((landmark, index) => (
                        <button
                          key={landmark.id}
                          onClick={() => handleLandmarkSelect(landmark)}
                          className={cn(
                            'w-full flex items-center gap-4 p-4 hover:bg-koloi-gray-100 transition-colors text-left',
                            index !== landmarks.length - 1 && 'border-b border-koloi-gray-200'
                          )}
                        >
                          <div className="w-10 h-10 rounded-full bg-koloi-gray-200 flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate">{landmark.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{landmark.category}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fare Display & Request Button - Always visible when not searching */}
          {!activeField && (
            <div className="space-y-4">
              {/* Fare - Simple inline */}
              {fareEstimate && (
                <div className="pt-2">
                  <p className="text-3xl font-bold text-foreground">R{fareEstimate.fareR.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">
                    {fareEstimate.distanceKm.toFixed(1)} km • {fareEstimate.durationMinutes} min
                  </p>
                </div>
              )}

              {/* Request Ride Button - inDrive style */}
              <Button
                onClick={handleRequestRide}
                disabled={!canRequestRide}
                className={cn(
                  'w-full h-14 text-base font-bold rounded-2xl transition-all gap-2',
                  canRequestRide 
                    ? 'bg-accent text-accent-foreground hover:brightness-105 shadow-koloi-md' 
                    : 'bg-koloi-gray-300 text-muted-foreground'
                )}
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding drivers...
                  </>
                ) : !user ? (
                  'Sign in to request'
                ) : canRequestRide ? (
                  <>
                    Request Ride
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  'Select locations'
                )}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
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

      <AuthModalWrapper
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')}
      />
    </div>
  );
}
