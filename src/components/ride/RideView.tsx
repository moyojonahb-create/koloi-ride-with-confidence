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
import { useGooglePlacesAutocomplete } from '@/hooks/useGooglePlacesAutocomplete';
import { useTownPricing, calculateRecommendedFare, formatFare } from '@/hooks/useTownPricing';
import NegotiationCard from './NegotiationCard';
import { Button } from '@/components/ui/button';
import {
  Loader2, MapPin, Navigation, Crosshair, ArrowLeft, User, X, Search,
  Car, Star, Phone, MessageCircle, Clock, Users, ChevronRight, Locate,
  Banknote, Wallet, Zap, CarFront, Menu, History, Minus, Plus, Route } from
'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle } from
'@/components/ui/sheet';
import { cn } from '@/lib/utils';
import MapGoogle from '@/components/MapGoogle';
import RideStatusBanner, { type RideStatus } from './RideStatusBanner';
import OffersModal, { type DriverViewing, type DriverOffer } from '@/components/OffersModal';
import AuthModalWrapper from '@/components/auth/AuthModalWrapper';
import VoyexLogo from '@/components/VoyexLogo';
import QuickPickChips from './QuickPickChips';
import ProximityFilter from './ProximityFilter';

import RecentDestinations from './RecentDestinations';
import { useLandmarks as useLandmarksSearch, type Landmark } from '@/hooks/useLandmarks';
import { DEFAULT_TOWN, detectTown, type TownConfig } from '@/lib/towns';
import TownSelectorSheet from './TownSelectorSheet';

// ── types ──
interface SelectedLocation {name: string;lat: number;lng: number;}
interface GPSState {status: 'idle' | 'loading' | 'success' | 'denied' | 'unavailable';coords: {lat: number;lng: number;} | null;error: string | null;}
type VehicleTier = 'standard';
type PaymentMethod = 'cash' | 'wallet';

const VEHICLE_TIERS: {id: VehicleTier;name: string;icon: typeof Car;priceRange: string;passengers: string;eta: string;multiplier: number;}[] = [
{ id: 'standard', name: 'Voyex Standard', icon: Car, priceRange: 'R15 – R40', passengers: '1–4', eta: '3 min', multiplier: 1 }];


export default function RideView() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { data: pricingSettings } = usePricingSettings();
  const { findNearestLandmark } = useLandmarks({});

  // ── state ──
  const [pickupLocation, setPickupLocation] = useState<SelectedLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<SelectedLocation | null>(null);
  const [gpsState, setGpsState] = useState<GPSState>({ status: 'idle', coords: null, error: null });
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [proximityRadius, setProximityRadius] = useState<number | null>(null);
  const [nominatimResults, setNominatimResults] = useState<Array<{name: string;lat: number;lng: number;displayName: string;}>>([]);
  const [nominatimLoading, setNominatimLoading] = useState(false);
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<VehicleTier>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [passengerCount, setPassengerCount] = useState(1);
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  const [isRequesting, setIsRequesting] = useState(false);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [matchedDriver, setMatchedDriver] = useState<{name: string;car: string;plate: string;rating: number;avatar?: string;eta: number;} | null>(null);
  const [offersOpen, setOffersOpen] = useState(false);
  const [viewingDrivers, setViewingDrivers] = useState<DriverViewing[]>([]);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTown, setSelectedTown] = useState<TownConfig>(DEFAULT_TOWN);
  const { pricing: townPricing } = useTownPricing(selectedTown?.id ?? null);

  const { landmarks, loading: landmarksLoading } = useLandmarksSearch({ searchQuery, limit: 15, userLocation: gpsState.coords, radiusKm: proximityRadius });
  const { suggestions: googleSuggestions, loading: googleLoading, search: searchGoogle, getPlaceDetails, clear: clearGoogleSuggestions } = useGooglePlacesAutocomplete();

  // ── effects ──
  useEffect(() => {
    const rebook = (location.state as Record<string, unknown>)?.rebook as Record<string, unknown> | undefined;
    if (rebook) {
      if (rebook.pickup) setPickupLocation(rebook.pickup as SelectedLocation);
      if (rebook.dropoff) setDropoffLocation(rebook.dropoff as SelectedLocation);
      window.history.replaceState({}, '');
    }
  }, []);

  useEffect(() => {
    if (gpsState.status === 'idle' && navigator.geolocation) handleUseMyLocation();
  }, []);

  // ── route / fare ──
  const { route: routeData, loading: routeLoading } = useOSRMRoute(
    pickupLocation ? { lat: pickupLocation.lat, lng: pickupLocation.lng } : null,
    dropoffLocation ? { lat: dropoffLocation.lat, lng: dropoffLocation.lng } : null
  );

  const calculateFare = useCallback(() => {
    if (!routeData?.distanceKm) return null;
    const rec = calculateRecommendedFare(townPricing, routeData.distanceKm, routeData.durationMinutes);
    return { fareR: rec.recommended, distanceKm: routeData.distanceKm, durationMinutes: routeData.durationMinutes, currencySymbol: rec.currencySymbol, currencyCode: rec.currencyCode };
  }, [routeData, townPricing]);
  const fareEstimate = calculateFare();

  // ── handlers ──
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {setGpsState({ status: 'unavailable', coords: null, error: 'Geolocation not supported' });return;}
    setGpsState((prev) => ({ ...prev, status: 'loading', error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };setGpsState({ status: 'success', coords: c, error: null });setPickupLocation({ name: 'My location', lat: c.lat, lng: c.lng });setActiveField(null);setSelectedTown(detectTown(c.lat, c.lng));},
      (err) => {setGpsState({ status: 'denied', coords: null, error: err.code === err.PERMISSION_DENIED ? 'Location access denied' : 'Unable to get location' });},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleLandmarkSelect = (landmark: Landmark) => {
    const loc: SelectedLocation = { name: landmark.name, lat: landmark.latitude, lng: landmark.longitude };
    if (activeField === 'pickup') setPickupLocation(loc);else setDropoffLocation(loc);
    setActiveField(null);setSearchQuery('');setNominatimResults([]);
  };

  const handleNominatimSelect = (result: {name: string;lat: number;lng: number;}) => {
    const loc: SelectedLocation = { name: result.name, lat: result.lat, lng: result.lng };
    if (activeField === 'pickup') setPickupLocation(loc);else setDropoffLocation(loc);
    setActiveField(null);setSearchQuery('');setNominatimResults([]);
  };

  const handleQuickPickSelect = (pick: {name: string;lat: number;lng: number;}) => {
    const loc: SelectedLocation = { name: pick.name, lat: pick.lat, lng: pick.lng };
    if (activeField === 'pickup') setPickupLocation(loc);else if (activeField === 'dropoff') setDropoffLocation(loc);
    setActiveField(null);
  };

  const handleNominatimSearch = useCallback(async (query: string) => {
    if (query.trim().length < 3) {setNominatimResults([]);return;}
    setNominatimLoading(true);
    try {
      const results = await searchZW(query.trim());
      setNominatimResults(results.map((r) => ({ name: r.name || r.display_name.split(',')[0], lat: Number(r.lat), lng: Number(r.lon), displayName: r.display_name })));
      for (const r of results) cachePlaceFromNominatim(r).catch(() => {});
    } catch {setNominatimResults([]);} finally {setNominatimLoading(false);}
  }, []);

  const handleMapClick = useCallback(async (coords: {lat: number;lng: number;}) => {
    if (!activeField) return;
    setReverseGeoLoading(true);
    try {
      const result = await reverseZW(coords.lat, coords.lng);
      const name = result?.name || result?.display_name?.split(',')[0] || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      const loc: SelectedLocation = { name, lat: coords.lat, lng: coords.lng };
      if (activeField === 'pickup') {setPickupLocation(loc);setActiveField('dropoff');} else {setDropoffLocation(loc);setActiveField(null);}
      if (result) cachePlaceFromNominatim(result).catch(() => {});
    } catch {
      const loc: SelectedLocation = { name: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`, lat: coords.lat, lng: coords.lng };
      if (activeField === 'pickup') {setPickupLocation(loc);setActiveField('dropoff');} else {setDropoffLocation(loc);setActiveField(null);}
    } finally {setReverseGeoLoading(false);}
  }, [activeField]);

  const handleSendOffer = async (customFare: number) => {
    if (!user) {setAuthMode('login');setAuthModalOpen(true);return;}
    if (!pickupLocation || !dropoffLocation || !fareEstimate) {toast({ title: 'Select pickup and destination', variant: 'destructive' });return;}
    setIsRequesting(true);setRideStatus('searching');
    try {
      const result = await requestRide({
        pickup_address: pickupLocation.name, pickup_lat: pickupLocation.lat, pickup_lng: pickupLocation.lng,
        dropoff_address: dropoffLocation.name, dropoff_lat: dropoffLocation.lat, dropoff_lng: dropoffLocation.lng,
        distance_km: fareEstimate.distanceKm, duration_minutes: fareEstimate.durationMinutes,
        fare: customFare,
        route_polyline: routeData?.geometry || null, passenger_count: passengerCount,
        payment_method: paymentMethod, vehicle_type: selectedTier
      });
      if (!result.ok) throw new Error(result.error);
      setCurrentRideId(result.ride.id);
      toast({ title: 'Offer sent!', description: `${fareEstimate.currencySymbol}${customFare} — waiting for drivers…` });
      navigate(`/ride/${result.ride.id}`);
    } catch (error: unknown) {toast({ title: 'Failed to send offer', description: (error as Error).message, variant: 'destructive' });setRideStatus('idle');} finally {setIsRequesting(false);}
  };

  const handleAcceptOffer = async (offerId: string) => {setRideStatus('driver_assigned');setOffersOpen(false);toast({ title: 'Driver accepted!' });setMatchedDriver({ name: 'Sipho Ndlovu', car: 'Toyota Corolla', plate: 'ACB 2345', rating: 4.8, eta: 3 });setTimeout(() => setRideStatus('driver_arriving'), 2000);};
  const handleDeclineOffer = async (offerId: string) => {setOffers((prev) => prev.filter((o) => o.offerId !== offerId));if (offers.length <= 1) setRideStatus('searching');};
  const handleCancelRide = async () => {if (currentRideId) await supabase.from('rides').update({ status: 'cancelled' }).eq('id', currentRideId);setRideStatus('idle');setCurrentRideId(null);setOffers([]);setViewingDrivers([]);setMatchedDriver(null);toast({ title: 'Ride cancelled' });};

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length >= 3) {handleNominatimSearch(value);searchGoogle(value);} else {setNominatimResults([]);clearGoogleSuggestions();}
  };

  const handleGooglePlaceSelect = async (suggestion: {placeId: string;name: string;}) => {
    const details = await getPlaceDetails(suggestion.placeId);
    if (!details) return;
    const loc: SelectedLocation = { name: suggestion.name, lat: details.lat, lng: details.lng };
    if (activeField === 'pickup') setPickupLocation(loc);else setDropoffLocation(loc);
    setActiveField(null);setSearchQuery('');setNominatimResults([]);clearGoogleSuggestions();
  };

  const canRequestRide = pickupLocation && dropoffLocation && fareEstimate && !isRequesting;
  const showNominatimFallback = searchQuery.trim().length >= 3 && landmarks.length === 0 && nominatimResults.length > 0;

  // ═══════════════════════════════════════════
  // DRIVER MATCHED VIEW
  // ═══════════════════════════════════════════
  if (matchedDriver && (rideStatus === 'driver_assigned' || rideStatus === 'driver_arriving')) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
        <div className="absolute inset-0">
          <MapGoogle pickup={pickupLocation} dropoff={dropoffLocation} routeGeometry={routeData?.geometry} defaultCenter={selectedTown.center} defaultZoom={14} className="w-full h-full" height="100%" />
        </div>

        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, hsl(217 85% 29% / 0.12), transparent)' }} />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
          <button onClick={handleCancelRide} className="w-12 h-12 flex items-center justify-center rounded-full glass-card active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <VoyexLogo size="sm" />
          <div className="w-12" />
        </div>

        {/* ETA pill */}
        <div className="absolute top-24 left-4 right-4 z-30">
          <div className="glass-card-heavy p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <Clock className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Arriving in</p>
              <p className="text-3xl font-bold font-display text-foreground">{matchedDriver.eta} <span className="text-lg font-medium text-muted-foreground">min</span></p>
            </div>
          </div>
        </div>

        {/* Driver card bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-50">
          <div className="glass-card-heavy rounded-t-[24px] px-4 pt-4 pb-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <div className="w-10 h-1 rounded-full bg-foreground/10 mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center ring-2 ring-primary/20 shrink-0" style={{ background: 'var(--gradient-primary)' }}>
                <User className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold font-display text-foreground truncate">{matchedDriver.name}</p>
                <p className="text-sm text-muted-foreground truncate">{matchedDriver.car} · {matchedDriver.plate}</p>
              </div>
              <div className="flex items-center gap-1 glass-card rounded-full px-3 py-1.5 glass-glow-yellow shrink-0">
                <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                <span className="text-sm font-bold text-foreground">{matchedDriver.rating}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button className="flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-all" style={{ background: 'var(--gradient-primary)' }}>
                <Phone className="w-5 h-5 text-primary-foreground" />
                <span className="text-[11px] font-medium text-primary-foreground">Call</span>
              </button>
              <button className="flex flex-col items-center gap-1.5 py-3 rounded-2xl glass-card active:scale-95 transition-all">
                <MessageCircle className="w-5 h-5 text-primary" />
                <span className="text-[11px] font-medium text-foreground">Message</span>
              </button>
              <button onClick={handleCancelRide} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-destructive/8 active:scale-95 transition-all">
                <X className="w-5 h-5 text-destructive" />
                <span className="text-[11px] font-medium text-destructive">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      </div>);

  }

  // ═══════════════════════════════════════════
  // MAIN RIDE BOOKING UI
  // ═══════════════════════════════════════════
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* ── MAP ── */}
      <div className="absolute inset-0">
        <MapGoogle pickup={pickupLocation} dropoff={dropoffLocation} routeGeometry={routeData?.geometry} onMapClick={handleMapClick} defaultCenter={selectedTown.center} defaultZoom={14} className="w-full h-full" height="100%" />

        {/* Floating map buttons */}
        <div className="absolute right-3 z-20" style={{ bottom: sheetExpanded ? 'calc(60vh + 16px)' : 'calc(28vh + 16px)', transition: 'bottom 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
          <div className="flex flex-col gap-2.5">
            <button onClick={handleUseMyLocation} className="w-11 h-11 rounded-full glass-card flex items-center justify-center active:scale-90 transition-all glass-glow-blue">
              {gpsState.status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Locate className="w-5 h-5 text-primary" />}
            </button>
            <button className="w-11 h-11 rounded-full glass-card flex items-center justify-center active:scale-90 transition-all glass-glow-yellow">
              <Navigation className="w-5 h-5 text-accent" />
            </button>
          </div>
        </div>

        {/* Reverse geocode loading overlay */}
        {reverseGeoLoading &&
        <div className="absolute inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="glass-card-heavy rounded-full px-6 py-3.5 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">Finding address…</span>
            </div>
          </div>
        }

        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, hsl(217 85% 29% / 0.12), transparent)' }} />

        {/* Route loading */}
        {routeLoading && pickupLocation && dropoffLocation &&
        <div className="absolute inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="glass-card-heavy rounded-full px-6 py-3.5 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">Calculating route…</span>
            </div>
          </div>
        }

        {/* Tap-map instruction */}
        {activeField && !reverseGeoLoading &&
        <div className="absolute top-4 left-4 right-4 z-30">
            <div className="glass-card-heavy px-5 py-3.5 text-sm font-medium text-center text-foreground">
              📍 Tap map to set {activeField === 'pickup' ? 'pickup' : 'drop-off'}
            </div>
          </div>
        }
      </div>

      {/* ── TOP HEADER BUTTONS ── */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button onClick={() => setMenuOpen(true)} className="w-12 h-12 flex items-center justify-center rounded-full glass-card active:scale-95 transition-all glass-glow-blue">
          <Menu className="w-5 h-5 text-primary" />
        </button>
        <button onClick={() => user ? navigate(location.pathname.startsWith('/mapp') ? '/mapp/profile' : '/profile') : setAuthModalOpen(true)} className="w-12 h-12 flex items-center justify-center rounded-full glass-card active:scale-95 transition-all glass-glow-blue">
          <User className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* ── HAMBURGER MENU ── */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0 border-r border-border/20" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
          <SheetHeader className="px-5 pb-2 pt-4">
            <SheetTitle><VoyexLogo size="sm" /></SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-3 mt-2">
            <button
              onClick={() => {setMenuOpen(false);navigate(location.pathname.startsWith('/mapp') ? '/mapp/profile' : '/profile');}}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-muted active:scale-[0.98] transition-all">
              
              <User className="w-5 h-5 text-primary" />
              <span className="text-[15px] font-semibold text-foreground">Profile</span>
            </button>
            <button
              onClick={() => {setMenuOpen(false);navigate(location.pathname.startsWith('/mapp') ? '/mapp/wallet' : '/rider-wallet');}}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-muted active:scale-[0.98] transition-all">
              
              <Wallet className="w-5 h-5 text-primary" />
              <span className="text-[15px] font-semibold text-foreground">Wallet</span>
            </button>
            <button
              onClick={() => {setMenuOpen(false);navigate(location.pathname.startsWith('/mapp') ? '/mapp/history' : '/ride-history');}}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-muted active:scale-[0.98] transition-all">
              
              <History className="w-5 h-5 text-primary" />
              <span className="text-[15px] font-semibold text-foreground">History</span>
            </button>
          </nav>
        </SheetContent>
      </Sheet>

      {/* ── BOTTOM SHEET ── */}
      <div
        className="absolute left-0 right-0 bottom-0 z-50 flex flex-col glass-card-heavy"
        style={{
          height: sheetExpanded ? '75vh' : '44vh',
          transition: 'height 0.3s cubic-bezier(0.32,0.72,0,1)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        {/* Handle bar — tap to toggle */}
        <button
          onClick={() => setSheetExpanded(e => !e)}
          className="w-full pt-3 pb-2 flex justify-center shrink-0"
        >
          <div className="w-10 h-1 rounded-full bg-foreground/20" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 px-4 pb-2 space-y-3 min-h-0 overflow-y-auto overscroll-contain">

          {/* Town selector row */}
          <div className="flex items-center justify-between">
            <TownSelectorSheet currentTown={selectedTown} onSelect={(town) => {setSelectedTown(town);setPickupLocation(null);setDropoffLocation(null);}} />
            <p className="text-[10px] text-muted-foreground">{selectedTown.radiusKm}km area</p>
          </div>

          {/* Pickup & Dropoff — compact row cards */}
          <div className="space-y-2">
            <button
              onClick={() => {setActiveField('pickup');setSearchQuery('');}}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl active:scale-[0.98] transition-all text-left glass-card">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-accent">
                <MapPin className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Pickup</p>
                <p className={cn("text-[14px] font-medium truncate", pickupLocation ? 'text-foreground' : 'text-muted-foreground')}>
                  {pickupLocation?.name || 'Where from?'}
                </p>
              </div>
              {pickupLocation ?
                <span onClick={(e) => {e.stopPropagation();setPickupLocation(null);}} className="p-1.5 hover:bg-foreground/5 rounded-full"><X className="w-3.5 h-3.5 text-muted-foreground" /></span> :
                <button onClick={(e) => {e.stopPropagation();handleUseMyLocation();}} className="p-1.5 hover:bg-foreground/5 rounded-full"><Locate className="w-3.5 h-3.5 text-primary" /></button>
              }
            </button>

            <button
              onClick={() => {setActiveField('dropoff');setSearchQuery('');}}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl active:scale-[0.98] transition-all text-left glass-card">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--gradient-primary)' }}>
                <MapPin className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Drop-off</p>
                <p className={cn("text-[14px] font-medium truncate", dropoffLocation ? 'text-foreground' : 'text-muted-foreground')}>
                  {dropoffLocation?.name || 'Where to?'}
                </p>
              </div>
              {dropoffLocation &&
                <span onClick={(e) => {e.stopPropagation();setDropoffLocation(null);}} className="p-1.5 hover:bg-foreground/5 rounded-full"><X className="w-3.5 h-3.5 text-muted-foreground" /></span>
              }
            </button>
          </div>

          {/* Passenger selector — compact inline */}
          <div className="flex items-center justify-between glass-card rounded-2xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Passengers</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setPassengerCount((prev) => Math.max(1, prev - 1))}
                disabled={passengerCount <= 1}
                className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-all disabled:opacity-30">
                <Minus className="w-3.5 h-3.5 text-foreground" />
              </button>
              <span className="text-base font-bold text-foreground tabular-nums w-5 text-center">{passengerCount}</span>
              <button
                onClick={() => setPassengerCount((prev) => Math.min(10, prev + 1))}
                disabled={passengerCount >= 10}
                className="w-8 h-8 rounded-full glass-card flex items-center justify-center active:scale-90 transition-all disabled:opacity-30">
                <Plus className="w-3.5 h-3.5 text-foreground" />
              </button>
            </div>
          </div>
          {passengerCount > 3 &&
            <p className="text-[11px] text-accent font-medium -mt-1.5 ml-1">⚡ Extra passenger charges applied</p>
          }

          {/* ── Fare breakdown + Negotiation (expanded) ── */}
          {pickupLocation && dropoffLocation && fareEstimate && (() => {
            const activeTown = selectedTown.name;
            const isRandTown = activeTown?.toLowerCase() === 'gwanda' || activeTown?.toLowerCase() === 'beitbridge';
            const extraPassengers = Math.max(passengerCount - 3, 0);
            const extraPassengerFee = isRandTown ? extraPassengers * 5 : extraPassengers * 0.5;
            const baseFare = townPricing.base_fare;
            const distanceFare = fareEstimate.fareR - baseFare;
            const totalFare = baseFare + distanceFare + extraPassengerFee;
            const sym = fareEstimate.currencySymbol;
            const code = fareEstimate.currencyCode;
            const fmt = (v: number) => code === 'ZAR' ? `${sym}${Math.round(v)}` : `${sym}${v.toFixed(2)}`;

            return (
              <>
                {/* Compact fare card */}
                <div className="glass-card rounded-2xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fare Estimate</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{fareEstimate.distanceKm.toFixed(1)} km · ~{fareEstimate.durationMinutes} min</span>
                  </div>
                  <div className="border-t border-border/20 pt-1.5 space-y-1">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">Base fare</span>
                      <span className="text-foreground font-medium">{fmt(baseFare)}</span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">Distance fare</span>
                      <span className="text-foreground font-medium">{fmt(distanceFare)}</span>
                    </div>
                    {extraPassengerFee > 0 &&
                      <div className="flex justify-between text-[13px]">
                        <span className="text-accent font-medium">Extra passengers (×{extraPassengers})</span>
                        <span className="text-accent font-medium">+{fmt(extraPassengerFee)}</span>
                      </div>
                    }
                    <div className="flex justify-between text-sm font-bold border-t border-border/20 pt-1.5">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">{fmt(totalFare)}</span>
                    </div>
                  </div>
                </div>

                {/* Negotiation + Payment only when expanded */}
                {sheetExpanded && (
                  <>
                    <NegotiationCard
                      pricing={townPricing}
                      distanceKm={fareEstimate.distanceKm}
                      durationMinutes={fareEstimate.durationMinutes}
                      onSendOffer={(fare) => handleSendOffer(fare + extraPassengerFee)}
                      isSubmitting={isRequesting} />

                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Payment</p>
                      <div className="flex gap-2">
                        {[{ key: 'cash' as const, icon: Banknote, label: 'Cash' }, { key: 'wallet' as const, icon: Wallet, label: 'Wallet' }].map((pm) =>
                          <button
                            key={pm.key}
                            onClick={() => setPaymentMethod(pm.key)}
                            className={cn(
                              'flex-1 flex items-center gap-2 px-3 py-3 rounded-2xl transition-all active:scale-[0.98] glass-card',
                              paymentMethod === pm.key ? 'ring-1 ring-primary/25' : ''
                            )}>
                            <pm.icon className={cn('w-4 h-4', paymentMethod === pm.key ? 'text-primary' : 'text-muted-foreground')} />
                            <span className={cn('font-medium text-sm', paymentMethod === pm.key ? 'text-primary' : 'text-foreground')}>{pm.label}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {rideStatus !== 'idle' &&
                      <button onClick={handleCancelRide} className="w-full text-center text-sm text-destructive font-medium py-1.5 hover:underline transition-colors">Cancel Ride</button>
                    }
                  </>
                )}
              </>
            );
          })()}
        </div>

        {/* ── PINNED FIND DRIVERS BUTTON ── always visible at bottom */}
        <div className="shrink-0 px-4 pb-3 pt-2">
          {pickupLocation && dropoffLocation && fareEstimate ? (() => {
            const activeTown = selectedTown.name;
            const isRandTown = activeTown?.toLowerCase() === 'gwanda' || activeTown?.toLowerCase() === 'beitbridge';
            const extraPassengers = Math.max(passengerCount - 3, 0);
            const extraPassengerFee = isRandTown ? extraPassengers * 5 : extraPassengers * 0.5;
            const totalFare = townPricing.base_fare + (fareEstimate.fareR - townPricing.base_fare) + extraPassengerFee;
            const sym = fareEstimate.currencySymbol;
            const code = fareEstimate.currencyCode;
            const fmt = (v: number) => code === 'ZAR' ? `${sym}${Math.round(v)}` : `${sym}${v.toFixed(2)}`;
            return (
              <Button
                onClick={() => sheetExpanded ? handleSendOffer(totalFare) : setSheetExpanded(true)}
                disabled={isRequesting}
                className="w-full h-[48px] text-[15px] font-semibold rounded-2xl gap-2 shadow-[0_4px_20px_hsl(var(--primary)/0.3)]"
                style={{ background: 'var(--gradient-primary)' }}
              >
                {isRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
                {sheetExpanded ? `Send Offer • ${fmt(totalFare)}` : `Find Drivers • ${fmt(totalFare)}`}
              </Button>
            );
          })() : (
            <Button
              disabled
              className="w-full h-[48px] text-[15px] font-semibold rounded-2xl bg-primary/40 text-primary-foreground">
              {pickupLocation && dropoffLocation ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Calculating…</> : 'Find Drivers'}
            </Button>
          )}
        </div>
      </div>


      {/* ═══ SEARCH OVERLAY ═══ */}
      {activeField &&
      <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col" style={{ top: 0, background: 'hsl(var(--background) / 0.97)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}>
          {/* Map peek area — tappable to close */}
          <button onClick={() => {setActiveField(null);setSearchQuery('');setNominatimResults([]);}} className="flex-shrink-0 h-[15vh] w-full" aria-label="Close search" />

          {/* Search sheet rising from bottom */}
          <div className="flex-1 flex flex-col glass-card-heavy overflow-hidden" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          {/* Search header */}
          <div className="flex items-center gap-3 px-4 border-b border-border/30" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '14px' }}>
            <button onClick={() => {setActiveField(null);setSearchQuery('');setNominatimResults([]);}} className="w-11 h-11 flex items-center justify-center rounded-full glass-card active:scale-90 transition-all shrink-0">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
              autoFocus type="text"
              placeholder={activeField === 'pickup' ? 'Search pickup location…' : 'Search destination…'}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-12 pl-11 pr-4 glass-card text-[16px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 border-0"
              style={{ borderRadius: 18 }} />
            
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {/* GPS button */}
            {activeField === 'pickup' &&
          <button onClick={handleUseMyLocation} disabled={gpsState.status === 'loading'} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-primary/5 active:bg-primary/8 transition-colors border-b border-border/15 text-left">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--gradient-primary)' }}>
                  {gpsState.status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" /> : <Crosshair className="w-5 h-5 text-primary-foreground" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">Use my current location</p>
                  <p className="text-sm text-muted-foreground">Find pickup point automatically</p>
                </div>
              </button>
          }

            {gpsState.error && <p className="text-sm text-destructive bg-destructive/10 mx-4 my-3 p-3 rounded-xl">{gpsState.error}</p>}

            {gpsState.coords &&
          <div className="px-4 pt-3 pb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Nearby places</p>
                <ProximityFilter selected={proximityRadius} onSelect={setProximityRadius} />
              </div>
          }

            {!searchQuery.trim() && user &&
          <div className="px-4 pt-3 pb-2">
                <RecentDestinations
              field={activeField!}
              onSelect={(dest) => {
                const loc = { name: dest.name, lat: dest.lat, lng: dest.lng };
                if (activeField === 'pickup') setPickupLocation(loc);else setDropoffLocation(loc);
                setActiveField(null);setSearchQuery('');
              }} />
            
              </div>
          }

            {!searchQuery.trim() &&
          <div className="px-4 pt-4 pb-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Popular places</p>
                <QuickPickChips onSelect={handleQuickPickSelect} selectedName={activeField === 'pickup' ? pickupLocation?.name : dropoffLocation?.name} />
              </div>
          }

            {(searchQuery.trim() || proximityRadius !== null) &&
          <>
                <div className="px-4 pt-4 pb-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {searchQuery.trim() ? 'Results' : `Within ${proximityRadius}km`}
                  </p>
                </div>

                {landmarksLoading ?
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :

            <>
                    {landmarks.map((landmark) =>
              <button key={landmark.id} onClick={() => handleLandmarkSelect(landmark)} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-primary/5 transition-colors border-b border-border/15 text-left">
                        <div className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{landmark.name}</p>
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
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Searching more places…</span></div>
              }
                  </>
            }

                {(showNominatimFallback || landmarks.length > 0 && nominatimResults.length > 0) &&
            <>
                    <div className="px-4 py-2 bg-primary/5 border-t border-border/15">
                      <p className="text-[11px] font-semibold text-primary uppercase tracking-widest">📍 More places</p>
                    </div>
                    {nominatimResults.map((result, index) =>
              <button key={`nom-${index}`} onClick={() => handleNominatimSelect(result)} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-primary/5 transition-colors border-b border-border/15 text-left">
                        <div className="w-11 h-11 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0">
                          <Navigation className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{result.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{result.displayName}</p>
                        </div>
                      </button>
              )}
                  </>
            }

                {/* Google Places */}
                {googleSuggestions.length > 0 && searchQuery.trim().length >= 2 &&
            <>
                    <div className="px-4 py-2 bg-accent/8 border-t border-border/15">
                      <p className="text-[11px] font-semibold text-foreground uppercase tracking-widest">🌍 Streets & Places</p>
                    </div>
                    {googleSuggestions.map((suggestion) =>
              <button key={suggestion.placeId} onClick={() => handleGooglePlaceSelect(suggestion)} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-accent/5 transition-colors border-b border-border/15 text-left">
                        <div className="w-11 h-11 rounded-2xl bg-accent/12 flex items-center justify-center shrink-0">
                          <Search className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{suggestion.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{suggestion.description}</p>
                        </div>
                      </button>
              )}
                  </>
            }

                {googleLoading && !googleSuggestions.length &&
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Searching streets & places…</span></div>
            }
              </>
          }
          </div>
          </div>
        </div>
      }

      {/* Modals */}
      <OffersModal isOpen={offersOpen} tripId={currentRideId || ''} viewing={viewingDrivers} offers={offers} onAcceptOffer={handleAcceptOffer} onDeclineOffer={handleDeclineOffer} onCancelRide={handleCancelRide} onClose={() => setOffersOpen(false)} />
      <AuthModalWrapper isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} mode={authMode} onSwitchMode={() => setAuthMode((m) => m === 'login' ? 'signup' : 'login')} />
    </div>);

}