import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOSRMRoute } from '@/hooks/useOSRMRoute';
import { usePricingSettings } from '@/hooks/usePricingSettings';
import { useLandmarks } from '@/hooks/useLandmarks';
import { supabase } from '@/lib/supabaseClient';
import { requestRide } from '@/lib/requestRide';
import { searchZW, reverseZW } from '@/lib/geo_osm';
import { cachePlaceFromNominatim } from '@/lib/placeCache';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Loader2, MapPin, Navigation, Crosshair, ArrowLeft, User, X, Search,
  Car, Star, Phone, MessageCircle, Clock, Users, ChevronRight, Locate,
  Banknote, Wallet, Crown, Zap, CarFront } from
'lucide-react';
import { cn } from '@/lib/utils';
import MapGoogle from '@/components/MapGoogle';
import RideStatusBanner, { type RideStatus } from './RideStatusBanner';
import OffersModal, { type DriverViewing, type DriverOffer } from '@/components/OffersModal';
import AuthModalWrapper from '@/components/auth/AuthModalWrapper';
import KoloiLogo from '@/components/KoloiLogo';
import QuickPickChips from './QuickPickChips';
import ProximityFilter from './ProximityFilter';
import { useLandmarks as useLandmarksSearch, type Landmark } from '@/hooks/useLandmarks';

interface SelectedLocation {
  name: string;
  lat: number;
  lng: number;
}

interface GPSState {
  status: 'idle' | 'loading' | 'success' | 'denied' | 'unavailable';
  coords: {lat: number;lng: number;} | null;
  error: string | null;
}

type VehicleTier = 'standard';
type PaymentMethod = 'cash' | 'wallet';

const VEHICLE_TIERS: {
  id: VehicleTier;
  name: string;
  icon: typeof Car;
  priceRange: string;
  passengers: string;
  eta: string;
  multiplier: number;
}[] = [
{ id: 'standard', name: 'Koloi Standard', icon: Car, priceRange: 'R15 – R40', passengers: '1–4', eta: '3 min', multiplier: 1 }];


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
  const [nominatimResults, setNominatimResults] = useState<Array<{name: string;lat: number;lng: number;displayName: string;}>>([]);
  const [nominatimLoading, setNominatimLoading] = useState(false);
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);

  // Vehicle & payment
  const [selectedTier, setSelectedTier] = useState<VehicleTier>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [passengerCount, setPassengerCount] = useState(1);

  // Ride state
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  const [isRequesting, setIsRequesting] = useState(false);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);

  // Driver match state
  const [matchedDriver, setMatchedDriver] = useState<{
    name: string;car: string;plate: string;rating: number;avatar?: string;eta: number;
  } | null>(null);

  // Offers modal
  const [offersOpen, setOffersOpen] = useState(false);
  const [viewingDrivers, setViewingDrivers] = useState<DriverViewing[]>([]);
  const [offers, setOffers] = useState<DriverOffer[]>([]);

  // Auth modal
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Bottom sheet state
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Search landmarks with proximity filter
  const { landmarks, loading: landmarksLoading } = useLandmarksSearch({
    searchQuery,
    limit: 15,
    userLocation: gpsState.coords,
    radiusKm: proximityRadius
  });

  // Handle rebook from ride history
  useEffect(() => {
    const rebook = (location.state as unknown as Record<string, unknown>)?.rebook;
    if (rebook) {
      if (rebook.pickup) setPickupLocation(rebook.pickup);
      if (rebook.dropoff) setDropoffLocation(rebook.dropoff);
      window.history.replaceState({}, '');
    }
  }, []);

  // Auto-get GPS on mount
  useEffect(() => {
    if (gpsState.status === 'idle' && navigator.geolocation) {
      handleUseMyLocation();
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
    const tier = VEHICLE_TIERS.find((t) => t.id === selectedTier)!;
    let fare = (baseFare + distanceKm * perKmRate) * tier.multiplier;
    fare = Math.max(fare, minFare);
    return { fareR: Math.round(fare), distanceKm, durationMinutes };
  }, [routeData, pricingSettings, selectedTier]);
  const fareEstimate = calculateFare();

  // Handle GPS location
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState({ status: 'unavailable', coords: null, error: 'Geolocation not supported' });
      return;
    }
    setGpsState((prev) => ({ ...prev, status: 'loading', error: null }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setGpsState({ status: 'success', coords, error: null });
        setPickupLocation({ name: 'My location', lat: coords.lat, lng: coords.lng });
        setActiveField(null);
      },
      (error) => {
        let errorMessage = 'Unable to get location';
        if (error.code === error.PERMISSION_DENIED) errorMessage = 'Location access denied';
        setGpsState({ status: 'denied', coords: null, error: errorMessage });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Handle landmark selection
  const handleLandmarkSelect = (landmark: Landmark) => {
    const loc: SelectedLocation = { name: landmark.name, lat: landmark.latitude, lng: landmark.longitude };
    if (activeField === 'pickup') setPickupLocation(loc);else
    setDropoffLocation(loc);
    setActiveField(null);
    setSearchQuery('');
    setNominatimResults([]);
  };

  // Handle Nominatim result selection
  const handleNominatimSelect = (result: {name: string;lat: number;lng: number;}) => {
    const loc: SelectedLocation = { name: result.name, lat: result.lat, lng: result.lng };
    if (activeField === 'pickup') setPickupLocation(loc);else
    setDropoffLocation(loc);
    setActiveField(null);
    setSearchQuery('');
    setNominatimResults([]);
  };

  // Handle quick pick
  const handleQuickPickSelect = (pick: {name: string;lat: number;lng: number;}) => {
    const loc: SelectedLocation = { name: pick.name, lat: pick.lat, lng: pick.lng };
    if (activeField === 'pickup') setPickupLocation(loc);else
    if (activeField === 'dropoff') setDropoffLocation(loc);
    setActiveField(null);
  };

  // Nominatim fallback search
  const handleNominatimSearch = useCallback(async (query: string) => {
    if (query.trim().length < 3) {setNominatimResults([]);return;}
    setNominatimLoading(true);
    try {
      const results = await searchZW(query.trim());
      const mapped = results.map((r) => ({
        name: r.name || r.display_name.split(',')[0],
        lat: Number(r.lat), lng: Number(r.lon),
        displayName: r.display_name
      }));
      setNominatimResults(mapped);
      for (const r of results) cachePlaceFromNominatim(r).catch(() => {});
    } catch {setNominatimResults([]);} finally {setNominatimLoading(false);}
  }, []);

  // Handle map click
  const handleMapClick = useCallback(async (coords: {lat: number;lng: number;}) => {
    if (!activeField) return;
    setReverseGeoLoading(true);
    try {
      const result = await reverseZW(coords.lat, coords.lng);
      const name = result?.name || result?.display_name?.split(',')[0] || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      const loc: SelectedLocation = { name, lat: coords.lat, lng: coords.lng };
      if (activeField === 'pickup') {setPickupLocation(loc);setActiveField('dropoff');} else
      {setDropoffLocation(loc);setActiveField(null);}
      if (result) cachePlaceFromNominatim(result).catch(() => {});
    } catch {
      const fallbackName = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      const loc: SelectedLocation = { name: fallbackName, lat: coords.lat, lng: coords.lng };
      if (activeField === 'pickup') {setPickupLocation(loc);setActiveField('dropoff');} else
      {setDropoffLocation(loc);setActiveField(null);}
    } finally {setReverseGeoLoading(false);}
  }, [activeField]);

  // Request ride
  const handleRequestRide = async () => {
    if (!user) {setAuthMode('login');setAuthModalOpen(true);return;}
    if (!pickupLocation || !dropoffLocation || !fareEstimate) {
      toast({ title: 'Select pickup and destination', variant: 'destructive' });return;
    }
    setIsRequesting(true);
    setRideStatus('searching');
    try {
      const result = await requestRide({
        pickup_address: pickupLocation.name,
        pickup_lat: pickupLocation.lat, pickup_lng: pickupLocation.lng,
        dropoff_address: dropoffLocation.name,
        dropoff_lat: dropoffLocation.lat, dropoff_lng: dropoffLocation.lng,
        distance_km: fareEstimate.distanceKm,
        duration_minutes: fareEstimate.durationMinutes,
        fare: Math.max(5, fareEstimate.fareR),
        route_polyline: routeData?.geometry || null,
        passenger_count: passengerCount,
        payment_method: paymentMethod,
        vehicle_type: selectedTier
      });
      if (!result.ok) throw new Error(result.error);
      setCurrentRideId(result.ride.id);
      toast({ title: 'Ride requested!', description: 'Looking for nearby drivers...' });
      navigate(`/ride/${result.ride.id}`);
    } catch (error: unknown) {
      toast({ title: 'Failed to request ride', description: error.message, variant: 'destructive' });
      setRideStatus('idle');
    } finally {setIsRequesting(false);}
  };

  // Offer handlers
  const handleAcceptOffer = async (offerId: string) => {
    setRideStatus('driver_assigned');
    setOffersOpen(false);
    toast({ title: 'Driver accepted!', description: 'Your driver is on the way' });
    setMatchedDriver({
      name: 'Sipho Ndlovu', car: 'Toyota Corolla', plate: 'ACB 2345',
      rating: 4.8, eta: 3
    });
    setTimeout(() => setRideStatus('driver_arriving'), 2000);
  };
  const handleDeclineOffer = async (offerId: string) => {
    setOffers((prev) => prev.filter((o) => o.offerId !== offerId));
    if (offers.length <= 1) setRideStatus('searching');
  };
  const handleCancelRide = async () => {
    if (currentRideId) await supabase.from('rides').update({ status: 'cancelled' }).eq('id', currentRideId);
    setRideStatus('idle');
    setCurrentRideId(null);
    setOffers([]);
    setViewingDrivers([]);
    setMatchedDriver(null);
    toast({ title: 'Ride cancelled' });
  };

  // Search handler
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length >= 3) handleNominatimSearch(value);else
    setNominatimResults([]);
  };

  const canRequestRide = pickupLocation && dropoffLocation && fareEstimate && !isRequesting;
  const showNominatimFallback = searchQuery.trim().length >= 3 && landmarks.length === 0 && nominatimResults.length > 0;

  // ──────── DRIVER MATCH SCREEN ────────
  if (matchedDriver && (rideStatus === 'driver_assigned' || rideStatus === 'driver_arriving')) {
    return (
      <div className="flex flex-col bg-card" style={{ minHeight: '100dvh' }}>
        <header className="shrink-0 flex items-center justify-between h-14 px-4 bg-card border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <button onClick={handleCancelRide} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <KoloiLogo size="sm" />
          <div className="w-10" />
        </header>

        <div className="flex-1 relative min-h-[40vh]">
          <MapGoogle
            pickup={pickupLocation}
            dropoff={dropoffLocation}
            routeGeometry={routeData?.geometry}
            className="w-full h-full"
            height="100%" />
          
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-card rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Arriving in</p>
                <p className="text-lg font-bold text-foreground">{matchedDriver.eta} minutes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-5 py-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
          <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground">{matchedDriver.name}</p>
              <p className="text-sm text-muted-foreground">{matchedDriver.car} • {matchedDriver.plate}</p>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold text-amber-700">{matchedDriver.rating}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground active:scale-95 transition-all">
              <Phone className="w-5 h-5" />
              <span className="text-xs font-semibold">Call Driver</span>
            </button>
            <button className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-secondary text-foreground active:scale-95 transition-all">
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs font-semibold">Message</span>
            </button>
            <button onClick={handleCancelRide} className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-destructive/10 text-destructive active:scale-95 transition-all">
              <X className="w-5 h-5" />
              <span className="text-xs font-semibold">Cancel</span>
            </button>
          </div>
        </div>
      </div>);

  }

  // ──────── MAIN RIDE BOOKING UI ────────
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* ═══ MAP FULLSCREEN ═══ */}
      <div className="absolute inset-0">
        <MapGoogle
          pickup={pickupLocation}
          dropoff={dropoffLocation}
          routeGeometry={routeData?.geometry}
          onMapClick={handleMapClick}
          className="w-full h-full"
          height="100%" />
        

        {/* Map floating buttons */}
        <div className="absolute right-4 bottom-[280px] flex flex-col gap-3 z-20">
          <button
            onClick={handleUseMyLocation}
            className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-all bg-accent">
            
            {gpsState.status === 'loading' ?
            <Loader2 className="w-5 h-5 animate-spin text-primary" /> :

            <Locate className="w-5 h-5 text-primary" />
            }
          </button>
          <button className="w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center active:scale-90 transition-all">
            <Navigation className="w-5 h-5 text-yellow-400" />
          </button>
        </div>

        {/* Reverse geocode loading */}
        {reverseGeoLoading &&
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-md">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">Finding address...</span>
            </div>
          </div>
        }

        {/* Top gradient overlay for header readability */}
        <div className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none bg-gradient-to-b from-background/80 via-background/40 to-transparent" />

        {/* Route loading */}
        {routeLoading && pickupLocation && dropoffLocation &&
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-md">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">Calculating route...</span>
            </div>
          </div>
        }

        {/* Map click instruction */}
        {activeField && !reverseGeoLoading &&
        <div className="absolute top-4 left-4 right-4 z-30">
            <div className="bg-card/95 backdrop-blur rounded-xl px-4 py-2.5 text-sm font-medium text-center shadow-md text-foreground">
              📍 Tap map to set {activeField === 'pickup' ? 'pickup' : 'drop-off'}
            </div>
          </div>
        }
      </div>

      {/* ═══ FLOATING TOP BUTTONS ═══ */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button onClick={() => navigate(-1)} className="w-11 h-11 flex items-center justify-center rounded-full backdrop-blur shadow-md active:scale-95 transition-all bg-accent">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <button onClick={() => user ? navigate('/profile') : setAuthModalOpen(true)} className="w-11 h-11 flex items-center justify-center rounded-full backdrop-blur shadow-md active:scale-95 transition-all bg-accent">
          <User className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* ═══ BOTTOM SHEET PANEL ═══ */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-all duration-300',
          sheetExpanded ? 'max-h-[75vh] overflow-y-auto' : 'max-h-[55vh] overflow-y-auto'
        )}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
        
        <div className="sticky top-0 pt-3 pb-2 z-10 rounded-t-3xl bg-primary">
          <div className="w-10 h-1 rounded-full bg-border mx-auto" />
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Pickup */}
          <button
            onClick={() => {setActiveField('pickup');setSearchQuery('');}}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-all text-left bg-muted">
            
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-popover-foreground">PICKUP</p>
              <p className={cn("text-[15px] font-semibold truncate text-sidebar-accent", pickupLocation ? 'text-foreground' : 'text-muted-foreground')}>
                {pickupLocation?.name || 'Where from?'}
              </p>
            </div>
            {pickupLocation &&
            <span onClick={(e) => {e.stopPropagation();setPickupLocation(null);}} className="p-1.5 hover:bg-muted rounded-full transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </span>
            }
          </button>

          {/* Dropoff */}
          <button
            onClick={() => {setActiveField('dropoff');setSearchQuery('');}}
            className="w-full flex items-center gap-3 p-3.5 bg-secondary rounded-2xl hover:bg-secondary/80 active:scale-[0.98] transition-all text-left">
            
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary">
              <MapPin className="w-5 h-5 text-[#ffd500]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-accent-foreground">DROP-OFF</p>
              <p className={cn("text-[15px] font-semibold truncate text-sidebar-accent", dropoffLocation ? 'text-foreground' : 'text-muted-foreground')}>
                {dropoffLocation?.name || 'Where to?'}
              </p>
            </div>
            {dropoffLocation &&
            <span onClick={(e) => {e.stopPropagation();setDropoffLocation(null);}} className="p-1.5 hover:bg-muted rounded-full transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </span>
            }
          </button>

          {/* Vehicle & Payment & Button */}
          {pickupLocation && dropoffLocation &&
          <>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Your ride</p>
                <div className="space-y-2">
                  {VEHICLE_TIERS.map((tier) => {
                  const Icon = tier.icon;
                  const isSelected = selectedTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98]',
                        isSelected ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary hover:bg-secondary/80'
                      )}>
                      
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary", isSelected ? 'bg-primary' : 'bg-muted')}>
                          <CarFront className={cn("w-6 h-6 bg-koloi-yellow", isSelected ? 'text-primary-foreground' : 'text-muted-foreground')} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className={cn('font-bold', isSelected ? 'text-primary' : 'text-foreground')}>{tier.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{tier.passengers}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tier.eta}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn('text-lg font-bold', isSelected ? 'text-primary' : 'text-foreground')}>
                            {fareEstimate ? `R${fareEstimate.fareR}` : tier.priceRange}
                          </p>
                        </div>
                      </button>);

                })}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Payment method</p>
                <div className="flex gap-3">
                  <button
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    'flex-1 flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98]',
                    paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary'
                  )}>
                  
                    <Banknote className={cn('w-5 h-5', paymentMethod === 'cash' ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('font-semibold text-sm', paymentMethod === 'cash' ? 'text-primary' : 'text-foreground')}>Cash</span>
                  </button>
                  <button
                  onClick={() => setPaymentMethod('wallet')}
                  className={cn(
                    'flex-1 flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.98]',
                    paymentMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary'
                  )}>
                  
                    <Wallet className={cn('w-5 h-5', paymentMethod === 'wallet' ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('font-semibold text-sm', paymentMethod === 'wallet' ? 'text-primary' : 'text-foreground')}>Wallet</span>
                  </button>
                </div>
              </div>

              {/* FIND DRIVER */}
              <Button
              onClick={handleRequestRide}
              disabled={!canRequestRide}
              className={cn(
                'w-full h-[60px] text-base font-bold rounded-2xl transition-all gap-2 active:scale-[0.97]',
                canRequestRide ?
                'bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.4)]' :
                'bg-muted text-muted-foreground'
              )}>
              
                {isRequesting ?
              <><Loader2 className="w-5 h-5 animate-spin" /> Finding drivers...</> :
              !user ?
              'Sign in to continue' :
              canRequestRide ?
              'FIND DRIVER' :

              'Select locations'
              }
              </Button>

              {/* Negotiate */}
              <button
              onClick={() => user ? navigate('/negotiate/request') : setAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground py-2 hover:text-primary transition-colors">
              
                Prefer to negotiate the price?
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          }

          {(!pickupLocation || !dropoffLocation) &&
          <div className="text-center py-4">
              <p className="text-sm text-secondary-foreground">Select pickup and destination to see ride options</p>
            </div>
          }
        </div>
      </div>

      {/* ══ Full-Screen Search Overlay ══ */}
      {activeField &&
      <div className="fixed inset-0 z-[60] flex flex-col bg-card animate-slide-up">
          <div className="flex items-center gap-3 px-4 bg-card border-b border-border" style={{ paddingTop: `calc(env(safe-area-inset-top) + 14px)`, paddingBottom: '14px' }}>
            <button
            onClick={() => {setActiveField(null);setSearchQuery('');setNominatimResults([]);}}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary active:scale-90 transition-all shrink-0">
            
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
              autoFocus
              type="text"
              placeholder={activeField === 'pickup' ? 'Search pickup location...' : 'Search destination...'}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-12 pl-11 pr-4 bg-secondary rounded-2xl text-[16px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border-0" />
            
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeField === 'pickup' &&
          <button
            onClick={handleUseMyLocation}
            disabled={gpsState.status === 'loading'}
            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary active:bg-muted transition-colors border-b border-border/50 text-left">
            
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {gpsState.status === 'loading' ?
              <Loader2 className="w-5 h-5 animate-spin text-primary" /> :

              <Crosshair className="w-5 h-5 text-primary" />
              }
                </div>
                <div>
                  <p className="font-semibold text-foreground">Use my current location</p>
                  <p className="text-sm text-muted-foreground">Find pickup point automatically</p>
                </div>
              </button>
          }

            {gpsState.error &&
          <p className="text-sm text-amber-600 bg-amber-50 mx-4 my-3 p-3 rounded-xl">{gpsState.error}</p>
          }

            {gpsState.coords &&
          <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Nearby places</p>
                <ProximityFilter selected={proximityRadius} onSelect={setProximityRadius} />
              </div>
          }

            {!searchQuery.trim() &&
          <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Popular places</p>
                <QuickPickChips
              onSelect={handleQuickPickSelect}
              selectedName={activeField === 'pickup' ? pickupLocation?.name : dropoffLocation?.name} />
            
              </div>
          }

            {(searchQuery.trim() || proximityRadius !== null) &&
          <>
                <div className="px-4 pt-4 pb-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {searchQuery.trim() ? 'Results' : `Within ${proximityRadius}km`}
                  </p>
                </div>

                {landmarksLoading ?
            <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div> :

            <>
                    {landmarks.map((landmark) =>
              <button
                key={landmark.id}
                onClick={() => handleLandmarkSelect(landmark)}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors border-b border-border/50 text-left">
                
                        <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{landmark.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">{landmark.category}</p>
                        </div>
                      </button>
              )}

                    {landmarks.length === 0 && !nominatimLoading && !showNominatimFallback && searchQuery.trim() &&
              <div className="text-center py-12 text-muted-foreground">
                        <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No results for "{searchQuery}"</p>
                      </div>
              }

                    {nominatimLoading &&
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Searching more places...</span>
                      </div>
              }
                  </>
            }

                {(showNominatimFallback || landmarks.length > 0 && nominatimResults.length > 0) &&
            <>
                    <div className="px-4 py-2 bg-primary/5 border-t border-border">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">📍 More places</p>
                    </div>
                    {nominatimResults.map((result, index) =>
              <button
                key={`nom-${index}`}
                onClick={() => handleNominatimSelect(result)}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors border-b border-border/50 text-left">
                
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Navigation className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{result.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{result.displayName}</p>
                        </div>
                      </button>
              )}
                  </>
            }
              </>
          }
          </div>
        </div>
      }

      {/* Modals */}
      <OffersModal
        isOpen={offersOpen}
        tripId={currentRideId || ''}
        viewing={viewingDrivers}
        offers={offers}
        onAcceptOffer={handleAcceptOffer}
        onDeclineOffer={handleDeclineOffer}
        onCancelRide={handleCancelRide}
        onClose={() => setOffersOpen(false)} />
      
      <AuthModalWrapper
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={() => setAuthMode((m) => m === 'login' ? 'signup' : 'login')} />
      
    </div>);

}