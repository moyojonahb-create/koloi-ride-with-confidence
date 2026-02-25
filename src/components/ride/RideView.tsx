import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOSRMRoute } from '@/hooks/useOSRMRoute';
import { usePricingSettings } from '@/hooks/usePricingSettings';
import { useLandmarks } from '@/hooks/useLandmarks';
import { supabase } from '@/lib/supabaseClient';
import { requestRide } from '@/lib/requestRide';
import { nominatimSearchGwanda, nominatimReverse } from '@/lib/geo';
import { cachePlaceFromNominatim } from '@/lib/placeCache';
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
import EmergencyButton from './EmergencyButton';
import ProximityFilter from './ProximityFilter';
import PromoCodeInput from './PromoCodeInput';
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
  const location = useLocation();
  const { toast } = useToast();
  const { data: pricingSettings } = usePricingSettings();
  const { findNearestLandmark } = useLandmarks({});

  // Location state
  const [pickupLocation, setPickupLocation] = useState<SelectedLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<SelectedLocation | null>(null);
  const [gpsState, setGpsState] = useState<GPSState>({ status: 'idle', coords: null, error: null });
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [proximityRadius, setProximityRadius] = useState<number | null>(null);

  // Nominatim search state
  const [nominatimResults, setNominatimResults] = useState<Array<{ name: string; lat: number; lng: number; displayName: string }>>([]);
  const [nominatimLoading, setNominatimLoading] = useState(false);
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);

  // Passenger count
  const [passengerCount, setPassengerCount] = useState(1);
  // Payment & schedule (defaults — configurable in profile)
  const [paymentMethod] = useState<string>('cash');
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoId, setPromoId] = useState<string | null>(null);

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

  // Search landmarks with proximity filter
  const { landmarks, loading: landmarksLoading } = useLandmarksSearch({
    searchQuery,
    limit: 15,
    userLocation: gpsState.coords,
    radiusKm: proximityRadius,
  });

  // Handle rebook from ride history
  useEffect(() => {
    const rebook = (location.state as any)?.rebook;
    if (rebook) {
      if (rebook.pickup) setPickupLocation(rebook.pickup);
      if (rebook.dropoff) setDropoffLocation(rebook.dropoff);
      // Clear state so refresh doesn't re-apply
      window.history.replaceState({}, '');
    }
  }, []);

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
    let fare = baseFare + distanceKm * perKmRate;
    fare = Math.max(fare, minFare);
    return { fareR: Math.round(fare * 100) / 100, distanceKm, durationMinutes };
  }, [routeData, pricingSettings]);
  const fareEstimate = calculateFare();

  // Handle GPS location - ALWAYS set name to "My location"
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState({ status: 'unavailable', coords: null, error: 'Geolocation not supported' });
      return;
    }
    setGpsState(prev => ({ ...prev, status: 'loading', error: null }));
    navigator.geolocation.getCurrentPosition(
      position => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setGpsState({ status: 'success', coords, error: null });
        setPickupLocation({ name: 'My location', lat: coords.lat, lng: coords.lng });
        setActiveField(null);
      },
      error => {
        let errorMessage = 'Unable to get location';
        if (error.code === error.PERMISSION_DENIED) errorMessage = 'Location access denied';
        setGpsState({ status: 'denied', coords: null, error: errorMessage });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

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
    setNominatimResults([]);
  };

  // Handle Nominatim result selection
  const handleNominatimSelect = (result: { name: string; lat: number; lng: number }) => {
    const location: SelectedLocation = { name: result.name, lat: result.lat, lng: result.lng };
    if (activeField === 'pickup') {
      setPickupLocation(location);
    } else {
      setDropoffLocation(location);
    }
    setActiveField(null);
    setSearchQuery('');
    setNominatimResults([]);
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

  // Nominatim fallback search — triggered when landmark search returns no results
  const handleNominatimSearch = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setNominatimResults([]);
      return;
    }
    setNominatimLoading(true);
    try {
      const results = await nominatimSearchGwanda(query.trim());
      const mapped = results.map(r => ({
        name: r.name || r.display_name.split(',')[0],
        lat: Number(r.lat),
        lng: Number(r.lon),
        displayName: r.display_name,
      }));
      setNominatimResults(mapped);
      // Cache results in background
      for (const r of results) {
        cachePlaceFromNominatim(r).catch(() => {});
      }
    } catch {
      setNominatimResults([]);
    } finally {
      setNominatimLoading(false);
    }
  }, []);

  // Handle map click — reverse geocode via Nominatim
  const handleMapClick = useCallback(async (coords: { lat: number; lng: number }) => {
    if (!activeField) return;
    setReverseGeoLoading(true);
    try {
      const result = await nominatimReverse(coords.lat, coords.lng);
      const name = result?.name || result?.display_name?.split(',')[0] || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      const location: SelectedLocation = { name, lat: coords.lat, lng: coords.lng };

      if (activeField === 'pickup') {
        setPickupLocation(location);
        setActiveField('dropoff');
      } else {
        setDropoffLocation(location);
        setActiveField(null);
      }

      // Cache in background
      if (result) {
        cachePlaceFromNominatim(result).catch(() => {});
      }
    } catch {
      // Fallback: use raw coordinates
      const fallbackName = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      const location: SelectedLocation = { name: fallbackName, lat: coords.lat, lng: coords.lng };
      if (activeField === 'pickup') {
        setPickupLocation(location);
        setActiveField('dropoff');
      } else {
        setDropoffLocation(location);
        setActiveField(null);
      }
    } finally {
      setReverseGeoLoading(false);
    }
  }, [activeField]);

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
      const finalFare = promoDiscount ? fareEstimate.fareR - promoDiscount : fareEstimate.fareR;
      const result = await requestRide({
        pickup_address: pickupLocation.name,
        pickup_lat: pickupLocation.lat,
        pickup_lng: pickupLocation.lng,
        dropoff_address: dropoffLocation.name,
        dropoff_lat: dropoffLocation.lat,
        dropoff_lng: dropoffLocation.lng,
        distance_km: fareEstimate.distanceKm,
        duration_minutes: fareEstimate.durationMinutes,
        fare: Math.max(5, finalFare),
        route_polyline: routeData?.geometry || null,
        passenger_count: passengerCount,
        scheduled_at: undefined,
        payment_method: paymentMethod,
      });
      if (!result.ok) throw new Error(result.error);
      const data = result.ride;
      setCurrentRideId(data.id);
      toast({ title: 'Ride requested!', description: 'Looking for nearby drivers...' });
      navigate(`/ride/${data.id}`);
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

  // Search handler with Nominatim fallback
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Trigger Nominatim search when query is long enough (runs alongside landmark search)
    if (value.trim().length >= 3) {
      handleNominatimSearch(value);
    } else {
      setNominatimResults([]);
    }
  };

  const canRequestRide = pickupLocation && dropoffLocation && fareEstimate && !isRequesting;

  // Combine landmark results + nominatim results (deduped)
  const showNominatimFallback = searchQuery.trim().length >= 3 && landmarks.length === 0 && nominatimResults.length > 0;

  return (
    <div className="rider-screen bg-primary flex flex-col" style={{ minHeight: '100dvh' }}>
      <InstallPromptBanner />

      {/* Header — fixed, content scrolls beneath */}
      <header className="topbar shrink-0 flex items-center justify-between h-14 px-[calc(var(--pad,14px)+env(safe-area-inset-left))] pr-[calc(var(--pad,14px)+env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] pb-2 bg-primary z-30">
        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-white/10 text-primary-foreground hover:bg-white/20">
          <Menu className="w-5 h-5" />
        </Button>
        <KoloiLogo variant="light" size="sm" />
        <div className="flex items-center gap-2">
          <EmergencyButton />
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-white/10 text-primary-foreground hover:bg-white/20" onClick={() => user ? navigate('/profile') : setAuthModalOpen(true)}>
            <User className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Status Banner */}
      {rideStatus !== 'idle' && (
        <div className="shrink-0 px-4 pb-2">
          <RideStatusBanner status={rideStatus} offersCount={offers.length} />
        </div>
      )}

      {/* Main Content — scrollable below fixed header */}
      <main className="map-area relative flex-1 min-h-0 overflow-y-auto p-[var(--pad,14px)] pb-[calc(var(--pad,14px)+env(safe-area-inset-bottom))]">
        {/* Map Container */}
        <div
          id="map-container"
          className="absolute rounded-[22px] overflow-hidden bg-koloi-gray-200"
          style={{
            top: 'var(--pad, 14px)',
            left: 'var(--pad, 14px)',
            right: 'var(--pad, 14px)',
            bottom: 'var(--pad, 14px)',
          }}
        >
          <OSMMap
            pickup={pickupLocation}
            dropoff={dropoffLocation}
            routeGeometry={routeData?.geometry}
            onMapClick={handleMapClick}
            className="w-full h-full"
            height="100%"
            showRecenterButton
          />
        </div>

        {/* Reverse geocode loading overlay */}
        {reverseGeoLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-full shadow-koloi-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Finding address...</span>
            </div>
          </div>
        )}

        {/* Route loading overlay */}
        {routeLoading && pickupLocation && dropoffLocation && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-full shadow-koloi-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Calculating route...</span>
            </div>
          </div>
        )}

        {/* Map click instruction */}
        {activeField && !reverseGeoLoading && (
          <div className="absolute top-[calc(var(--pad,14px)+8px)] left-[calc(var(--pad,14px)+8px)] right-[calc(var(--pad,14px)+8px)] z-20">
            <div className="bg-background/90 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm font-medium text-center shadow-koloi-sm">
              📍 Tap map to set {activeField === 'pickup' ? 'pickup' : 'drop-off'}
            </div>
          </div>
        )}

        {/* Bottom Sheet — compact, always visible */}
        <section
          className="sheet absolute left-[var(--pad,14px)] right-[var(--pad,14px)] bottom-[calc(var(--pad,14px)+env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-[10px] rounded-[26px] p-[14px] shadow-[0_18px_40px_rgba(0,0,0,0.18)] z-30"
        >
          {/* Grabber */}
          <div className="grabber w-11 h-[5px] rounded-full bg-black/15 mx-auto mb-3" />

          {/* Location Inputs - compact summary when locations selected */}
          {(pickupLocation || dropoffLocation) && !activeField && (
            <div className="inputs grid gap-[10px] mb-3">
              <button
                type="button"
                onClick={() => { setActiveField('pickup'); setSearchQuery(''); }}
                className="input grid grid-cols-[22px_1fr_auto] items-center bg-white rounded-2xl py-3 px-3 border border-black/5 cursor-pointer hover:bg-koloi-gray-100/50 transition-colors w-full text-left"
              >
                <span className={cn('dot w-2.5 h-2.5 rounded-full shrink-0', pickupLocation ? 'bg-accent' : 'bg-koloi-gray-400')} />
                <span className={cn('text-base font-medium truncate', pickupLocation ? 'text-foreground' : 'text-muted-foreground')}>
                  {pickupLocation?.name || 'From where?'}
                </span>
                {pickupLocation && (
                  <span onClick={e => { e.stopPropagation(); setPickupLocation(null); }} className="p-1.5 hover:bg-koloi-gray-200 rounded-full transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setActiveField('dropoff'); setSearchQuery(''); }}
                className="input grid grid-cols-[22px_1fr_auto] items-center bg-white rounded-2xl py-3 px-3 border border-black/5 cursor-pointer hover:bg-koloi-gray-100/50 transition-colors w-full text-left"
              >
                <span className={cn('dot w-2.5 h-2.5 rounded-full shrink-0', dropoffLocation ? 'bg-primary' : 'bg-koloi-gray-400')} />
                <span className={cn('text-base font-medium truncate', dropoffLocation ? 'text-foreground' : 'text-muted-foreground')}>
                  {dropoffLocation?.name || 'Where to?'}
                </span>
                {dropoffLocation && (
                  <span onClick={e => { e.stopPropagation(); setDropoffLocation(null); }} className="p-1.5 hover:bg-koloi-gray-200 rounded-full transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Main controls — always visible when not searching */}
          {!activeField && (
            <div className="space-y-3">
              {/* Location inputs when nothing selected yet */}
              {!pickupLocation && !dropoffLocation && (
                <div className="inputs grid gap-[10px]">
                  <button
                    type="button"
                    onClick={() => { setActiveField('pickup'); setSearchQuery(''); }}
                    className="input grid grid-cols-[22px_1fr] items-center bg-white rounded-2xl py-3 px-3 border border-black/5 cursor-pointer hover:bg-koloi-gray-100/50 transition-colors w-full text-left"
                  >
                    <span className="dot w-2.5 h-2.5 rounded-full shrink-0 bg-koloi-gray-400" />
                    <span className="text-base font-medium text-muted-foreground">From where?</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveField('dropoff'); setSearchQuery(''); }}
                    className="input grid grid-cols-[22px_1fr] items-center bg-white rounded-2xl py-3 px-3 border border-black/5 cursor-pointer hover:bg-koloi-gray-100/50 transition-colors w-full text-left"
                  >
                    <span className="dot w-2.5 h-2.5 rounded-full shrink-0 bg-koloi-gray-400" />
                    <span className="text-base font-medium text-muted-foreground">Where to?</span>
                  </button>
                </div>
              )}

              {/* Passenger Count Selector */}
              <div className="flex items-center justify-between bg-koloi-gray-100 rounded-2xl p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Passengers</p>
                  <p className="text-xs text-muted-foreground">How many are riding?</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPassengerCount(c => Math.max(1, c - 1))}
                    disabled={passengerCount <= 1}
                    className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-lg font-bold text-foreground disabled:opacity-30 transition-opacity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-lg font-bold text-foreground">{passengerCount}</span>
                  <button
                    onClick={() => setPassengerCount(c => Math.min(10, c + 1))}
                    disabled={passengerCount >= 10}
                    className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-lg font-bold text-foreground disabled:opacity-30 transition-opacity"
                  >
                    +
                  </button>
                </div>
              </div>

              {fareEstimate && (
                <div className="pt-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">
                      R{promoDiscount ? (fareEstimate.fareR - promoDiscount).toFixed(0) : fareEstimate.fareR.toFixed(0)}
                    </p>
                    {promoDiscount && (
                      <p className="text-lg text-muted-foreground line-through">R{fareEstimate.fareR.toFixed(0)}</p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {fareEstimate.distanceKm.toFixed(1)} km • {fareEstimate.durationMinutes} min
                  </p>
                </div>
              )}

              {/* Promo Code */}
              {fareEstimate && (
                <PromoCodeInput
                  fare={fareEstimate.fareR}
                  appliedDiscount={promoDiscount}
                  onApply={(discount, id) => { setPromoDiscount(discount); setPromoId(id); }}
                  onRemove={() => { setPromoDiscount(null); setPromoId(null); }}
                />
              )}

              {/* Request button */}
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

              {/* inDrive-style: negotiate fare with drivers */}
              <button
                onClick={() => user ? navigate('/negotiate/request') : setAuthModalOpen(true)}
                className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 py-1 hover:text-foreground transition-colors"
              >
                Prefer to negotiate the price? →
              </button>
            </div>
          )}
        </section>

        {/* ══ inDrive-style Full-Screen Search Overlay ══ */}
        {activeField && (
          <div className="absolute inset-0 z-40 flex flex-col bg-background" style={{ animation: 'slideUp 0.25s ease' }}>
            {/* Search header */}
            <div className="flex items-center gap-3 px-4 bg-background border-b border-border" style={{ paddingTop: `calc(env(safe-area-inset-top) + 12px)`, paddingBottom: '12px' }}>
              <button
                onClick={() => { setActiveField(null); setSearchQuery(''); setNominatimResults([]); }}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  placeholder={activeField === 'pickup' ? 'Search pickup location...' : 'Search destination...'}
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-muted rounded-xl text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent border-0"
                />
              </div>
            </div>

            {/* Scrollable results */}
            <div className="flex-1 overflow-y-auto">
              {/* My Location — pickup only */}
              {activeField === 'pickup' && (
                <button
                  onClick={handleUseMyLocation}
                  disabled={gpsState.status === 'loading'}
                  className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted transition-colors border-b border-border text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    {gpsState.status === 'loading' ? (
                      <Loader2 className="w-5 h-5 animate-spin text-accent" />
                    ) : (
                      <Crosshair className="w-5 h-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Use my current location</p>
                    <p className="text-sm text-muted-foreground">Find pickup point automatically</p>
                  </div>
                </button>
              )}

              {gpsState.error && (
                <p className="text-sm text-amber-600 bg-amber-50 mx-4 my-3 p-3 rounded-xl">{gpsState.error}</p>
              )}

              {/* Proximity Filter */}
              {gpsState.coords && (
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nearby places</p>
                  <ProximityFilter selected={proximityRadius} onSelect={setProximityRadius} />
                </div>
              )}

              {/* Quick Picks — shown when no search query */}
              {!searchQuery.trim() && (
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Popular places</p>
                  <QuickPickChips
                    onSelect={handleQuickPickSelect}
                    selectedName={activeField === 'pickup' ? pickupLocation?.name : dropoffLocation?.name}
                  />
                </div>
              )}

              {/* Search / proximity results */}
              {(searchQuery.trim() || proximityRadius !== null) && (
                <>
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {searchQuery.trim() ? 'Results' : `Within ${proximityRadius}km`}
                    </p>
                  </div>

                  {landmarksLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    </div>
                  ) : (
                    <>
                      {landmarks.map((landmark) => (
                        <button
                          key={landmark.id}
                          onClick={() => handleLandmarkSelect(landmark)}
                          className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted transition-colors border-b border-border/50 text-left"
                        >
                          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate">{landmark.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{landmark.category}</p>
                          </div>
                        </button>
                      ))}

                      {landmarks.length === 0 && !nominatimLoading && !showNominatimFallback && searchQuery.trim() && (
                        <div className="text-center py-12 text-muted-foreground">
                          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No results for "{searchQuery}"</p>
                        </div>
                      )}

                      {nominatimLoading && (
                        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Searching more places...</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Nominatim / OSM results */}
                  {(showNominatimFallback || (landmarks.length > 0 && nominatimResults.length > 0)) && (
                    <>
                      <div className="px-4 py-2 bg-accent/5 border-t border-border">
                        <p className="text-xs font-semibold text-accent uppercase tracking-wider">📍 More places in Gwanda</p>
                      </div>
                      {nominatimResults.map((result, index) => (
                        <button
                          key={`nom-${index}`}
                          onClick={() => handleNominatimSelect(result)}
                          className="w-full flex items-center gap-4 px-4 py-4 hover:bg-muted transition-colors border-b border-border/50 text-left"
                        >
                          <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                            <Navigation className="w-5 h-5 text-accent" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate">{result.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{result.displayName}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
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
        onSwitchMode={() => setAuthMode(m => (m === 'login' ? 'signup' : 'login'))}
      />
    </div>
  );
}
