/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { haptic } from '@/lib/haptics';
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
import BottomNavBar from '@/components/BottomNavBar';
import { Button } from '@/components/ui/button';
import {
  Loader2, MapPin, Navigation, Crosshair, ArrowLeft, User, X, Search,
  Car, Star, Phone, MessageCircle, Clock, Users, ChevronRight, Locate,
  Banknote, Wallet, Menu, History, Minus, Plus, Route, ContactRound, Home, Briefcase, CalendarClock, Sparkles, ShieldCheck, Timer } from
'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle } from
'@/components/ui/sheet';
import { cn } from '@/lib/utils';
import MapGoogle from '@/components/MapGoogle';
import RideStatusBanner, { type RideStatus } from './RideStatusBanner';
import { type DriverViewing, type DriverOffer } from '@/components/OffersModal';
import AuthModalWrapper from '@/components/auth/AuthModalWrapper';
import VoyexLogo from '@/components/VoyexLogo';
import { GlassSheet } from '@/components/ui/glass-sheet';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { InputField } from '@/components/ui/input-field';
import { IconPillButton } from '@/components/ui/icon-pill-button';
import QuickPickChips from './QuickPickChips';
import ProximityFilter from './ProximityFilter';
import EmergencyButton from './EmergencyButton';
import { NotificationBell } from '@/components/NotificationCenter';

import MultiStopInput, { type RideStop } from './MultiStopInput';
import ScheduleRide from './ScheduleRide';
import { useLandmarks as useLandmarksSearch, type Landmark } from '@/hooks/useLandmarks';
import { DEFAULT_TOWN, detectTown, type TownConfig } from '@/lib/towns';
import TownSelectorSheet from './TownSelectorSheet';
import ShareTripButton from './ShareTripButton';

// ── types ──
import { type ServiceType } from '@/components/VehicleTypeSelector';
import IntercitySelector from './IntercitySelector';
import { type IntercityRoute } from '@/lib/intercityRoutes';
import { useNearbyDrivers } from '@/hooks/useNearbyDrivers';
import GenderPreferenceToggle, { type GenderPreference } from './GenderPreferenceToggle';

interface SelectedLocation {name: string;lat: number;lng: number;}
interface GPSState {status: 'idle' | 'loading' | 'success' | 'denied' | 'unavailable';coords: {lat: number;lng: number;} | null;error: string | null;}
type VehicleTier = 'standard';
type PaymentMethod = 'cash' | 'wallet' | 'ecocash';

const SERVICE_TABS: {id: ServiceType;label: string;icon: string;}[] = [
{ id: 'ride', label: 'Ride', icon: '🚗' },
{ id: 'intercity', label: 'Intercity', icon: '🛣️' },
{ id: 'courier', label: 'Courier', icon: '📦' },
{ id: 'freight', label: 'Freight', icon: '🚛' }];


const VEHICLE_TIERS: {id: VehicleTier;name: string;icon: typeof Car;priceRange: string;passengers: string;eta: string;multiplier: number;}[] = [
{ id: 'standard', name: 'Voyex Standard', icon: Car, priceRange: '$1.50 – $10', passengers: '1–4', eta: '3 min', multiplier: 1 }];


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
  const [serviceType, setServiceType] = useState<ServiceType>('ride');
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
  const [bookForSomeoneElse, setBookForSomeoneElse] = useState(false);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  const [isRequesting, setIsRequesting] = useState(false);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const [matchedDriver, setMatchedDriver] = useState<{name: string;car: string;plate: string;rating: number;avatar?: string;eta: number;} | null>(null);
  const [viewingDrivers, setViewingDrivers] = useState<DriverViewing[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [searchFare, setSearchFare] = useState<number | null>(null);
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
  const [autoAcceptMaxEta, setAutoAcceptMaxEta] = useState(8);
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTown, setSelectedTown] = useState<TownConfig>(DEFAULT_TOWN);
  const [rideStops, setRideStops] = useState<RideStop[]>([]);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const safeTown = selectedTown ?? DEFAULT_TOWN;
  const { pricing: townPricing } = useTownPricing(safeTown.id ?? null);
  const [genderPreference, setGenderPreference] = useState<GenderPreference>('any');
  const prefersReducedMotion = useReducedMotion();

  const { landmarks, loading: landmarksLoading } = useLandmarksSearch({
    searchQuery,
    limit: 30,
    userLocation: gpsState.coords,
    radiusKm: proximityRadius,
    townCenter: safeTown.center,
    townRadiusKm: safeTown.radiusKm
  });
  const nearbyDrivers = useNearbyDrivers(rideStatus === 'idle' || rideStatus === 'searching');
  const { suggestions: googleSuggestions, loading: googleLoading, search: searchGoogle, getPlaceDetails, clear: clearGoogleSuggestions, setTownBias } = useGooglePlacesAutocomplete();

  // Bias Google Places to selected town
  useEffect(() => {
    setTownBias(safeTown.center, safeTown.radiusKm);
  }, [safeTown, setTownBias]);

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

  const loadViewerRows = useCallback(async (rideRequestId: string) => {
    const activeSinceIso = new Date(Date.now() - 20_000).toISOString();

    try {
      const { data, error } = await supabase
        .from('ride_request_views')
        .select('id')
        .eq('ride_request_id', rideRequestId)
        .gt('last_seen_at', activeSinceIso);

      console.log('Rider viewers fetch:', { rideRequestId, activeSinceIso, data, error });

      if (error) throw error;

      const mappedViewers: DriverViewing[] = (data ?? []).map((row, idx) => ({
        driverId: String(row.id ?? `viewer-${idx}`),
        name: `Driver ${idx + 1}`,
        phone: '+263',
        vehicleType: 'Car',
        plateNumber: '—',
        vehicleColor: undefined,
        languages: ['English'],
        distanceKm: 0,
        etaMinutes: 0,
      }));

      setViewerCount((data ?? []).length);
      setViewingDrivers(mappedViewers);
    } catch {
      setViewerCount(0);
      setViewingDrivers([]);
    }
  }, []);

  const loadPendingOffers = useCallback(async (rideRequestId: string) => {
    try {
      const { data, error } = await supabase
        .from('ride_offers')
        .select('*')
        .eq('ride_request_id', rideRequestId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      console.log('Rider offers fetch:', { rideRequestId, data, error });

      if (error) throw error;

      const rows = data ?? [];

      const mappedOffers: DriverOffer[] = rows.map((row, idx) => {
        const profile = (row.driver as Record<string, unknown>) || (row.drivers as Record<string, unknown>) || {};
        const name = row.driver_name ?? row.name ?? profile.full_name ?? profile.display_name ?? profile.name ?? 'Driver offer';
        return {
          driverId: String(row.driver_id ?? profile.id ?? `offer-driver-${idx}`),
          offerId: String(row.id ?? `offer-${idx}`),
          name: String(name),
          driverName: String(name),
          phone: String(row.phone ?? row.driver_phone ?? '+263'),
          vehicleType: ((row.vehicle_type ?? profile.vehicle_type ?? 'Car') === 'Motorbike' ? 'Motorbike' : (row.vehicle_type ?? profile.vehicle_type ?? 'Car') === 'Taxi' ? 'Taxi' : 'Car') as DriverViewing['vehicleType'],
          plateNumber: String(row.plate_number ?? profile.plate_number ?? '—'),
          vehicleColor: (row.vehicle_color ?? profile.vehicle_color ?? undefined) as string | undefined,
          languages: Array.isArray(row.languages) ? (row.languages as string[]) : ['English'],
          distanceKm: Number(row.distance_km ?? row.distance ?? 0),
          etaMinutes: Number(row.eta_minutes ?? row.eta ?? 0),
          offeredFareR: Number(row.offered_fare ?? row.offer_fare ?? row.price ?? 0),
          createdAt: String(row.created_at ?? new Date().toISOString()),
          avatarUrl: (row.avatar_url ?? profile.avatar_url ?? null) as string | null,
          ratingAvg: Number(row.rating_avg ?? profile.rating_avg ?? 0) || null,
          totalTrips: Number(row.total_trips ?? profile.total_trips ?? 0) || null,
          vehicleMake: (row.vehicle_make ?? profile.vehicle_make ?? undefined) as string | undefined,
          vehicleModel: (row.vehicle_model ?? profile.vehicle_model ?? undefined) as string | undefined,
          gender: (row.gender ?? profile.gender ?? null) as string | null,
        };
      });

      setOffers(mappedOffers);
    } catch {
      setOffers([]);
    }
  }, []);

  const loadAcceptedOffer = useCallback(async (rideRequestId: string) => {
    try {
      const { data, error } = await supabase
        .from('ride_offers')
        .select('*')
        .eq('ride_request_id', rideRequestId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('Rider accepted-offer fetch:', { rideRequestId, data, error });

      if (error) return;
      const accepted = (data ?? [])[0] as Record<string, unknown> | undefined;
      if (!accepted) return;

      setMatchedDriver({
        name: String(accepted.driver_name ?? 'Driver'),
        car: String(accepted.vehicle_type ?? 'Car'),
        plate: String(accepted.plate_number ?? '—'),
        rating: Number(accepted.rating_avg ?? 4.5),
        eta: Number(accepted.eta_minutes ?? 5),
      });
      setRideStatus('driver_assigned');
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (!currentRideId || rideStatus !== 'searching') return;

    let mounted = true;
    const refreshAll = async () => {
      if (!mounted) return;
      await Promise.all([
        loadViewerRows(currentRideId),
        loadPendingOffers(currentRideId),
        loadAcceptedOffer(currentRideId)
      ]);
    };

    refreshAll();

    const viewersChannel = supabase
      .channel(`ride-request-views-${currentRideId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ride_request_views', filter: `ride_request_id=eq.${currentRideId}` },
        () => { refreshAll(); }
      )
      .subscribe();

    const offersChannel = supabase
      .channel(`ride-offers-${currentRideId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ride_offers', filter: `ride_request_id=eq.${currentRideId}` },
        () => { refreshAll(); }
      )
      .subscribe();

    const viewersRefreshTimer = window.setInterval(() => {
      refreshAll();
    }, 8000);

    return () => {
      mounted = false;
      window.clearInterval(viewersRefreshTimer);
      supabase.removeChannel(viewersChannel);
      supabase.removeChannel(offersChannel);
    };
  }, [currentRideId, rideStatus, loadViewerRows, loadPendingOffers, loadAcceptedOffer]);

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
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsState({ status: 'success', coords: c, error: null });
        setPickupLocation({ name: 'My location', lat: c.lat, lng: c.lng });
        setActiveField(null);
        setSelectedTown(detectTown(c.lat, c.lng) ?? DEFAULT_TOWN);
      },
      (err) => {setGpsState({ status: 'denied', coords: null, error: err.code === err.PERMISSION_DENIED ? 'Location access denied' : 'Unable to get location' });},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleLandmarkSelect = (landmark: Landmark) => {
    const loc: SelectedLocation = { name: landmark.name, lat: landmark.latitude, lng: landmark.longitude };
    if (activeStopId) {
      setRideStops((prev) => prev.map((s) => s.id === activeStopId ? { ...s, address: loc.name, lat: loc.lat, lng: loc.lng } : s));
      setActiveStopId(null);
    } else if (activeField === 'pickup') setPickupLocation(loc);else
    setDropoffLocation(loc);
    setActiveField(null);setSearchQuery('');setNominatimResults([]);
    haptic('light');
  };

  const handleNominatimSelect = (result: {name: string;lat: number;lng: number;}) => {
    const loc: SelectedLocation = { name: result.name, lat: result.lat, lng: result.lng };
    if (activeStopId) {
      setRideStops((prev) => prev.map((s) => s.id === activeStopId ? { ...s, address: loc.name, lat: loc.lat, lng: loc.lng } : s));
      setActiveStopId(null);
    } else if (activeField === 'pickup') setPickupLocation(loc);else
    setDropoffLocation(loc);
    setActiveField(null);setSearchQuery('');setNominatimResults([]);
  };

  const handleQuickPickSelect = (pick: {name: string;lat: number;lng: number;}) => {
    const loc: SelectedLocation = { name: pick.name, lat: pick.lat, lng: pick.lng };
    if (activeField === 'pickup') setPickupLocation(loc);else if (activeField === 'dropoff') setDropoffLocation(loc);
    setActiveField(null);
  };

  const handleSwapPickupDropoff = () => {
    if (!pickupLocation && !dropoffLocation) return;
    setPickupLocation(dropoffLocation);
    setDropoffLocation(pickupLocation);
    haptic('light');
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

  const handlePickPassengerFromContacts = async () => {
    try {
      const nav = navigator as Navigator & {
        contacts?: { select: (properties: string[], options?: { multiple?: boolean }) => Promise<Array<Record<string, unknown>>> }
      };
      if (!nav.contacts?.select) {
        toast({ title: 'Contacts not supported', description: 'Please enter passenger details manually.' });
        return;
      }
      const selected = await nav.contacts.select(['name', 'tel'], { multiple: false });
      if (!selected?.length) return;
      const first = selected[0];
      const names = first.name as string[] | undefined;
      const tels = first.tel as string[] | undefined;
      if (names?.[0]) setPassengerName(names[0]);
      if (tels?.[0]) setPassengerPhone(tels[0]);
    } catch {
      toast({ title: 'Could not read contacts', description: 'Please enter passenger details manually.' });
    }
  };

  const handleSendOffer = async (customFare: number) => {
    if (!user) {setAuthMode('login');setAuthModalOpen(true);return;}
    if (!pickupLocation || !dropoffLocation || !fareEstimate) {toast({ title: 'Select pickup and destination', variant: 'destructive' });return;}
    haptic('medium');
    setIsRequesting(true);setRideStatus('searching');
    try {
      const result = await requestRide({
        pickup_address: pickupLocation.name, pickup_lat: pickupLocation.lat, pickup_lng: pickupLocation.lng,
        dropoff_address: dropoffLocation.name, dropoff_lat: dropoffLocation.lat, dropoff_lng: dropoffLocation.lng,
        distance_km: fareEstimate.distanceKm, duration_minutes: fareEstimate.durationMinutes,
        fare: customFare,
        route_polyline: routeData?.geometry || null, passenger_count: passengerCount,
        payment_method: paymentMethod, vehicle_type: selectedTier,
        town_id: selectedTown?.id ?? null,
        gender_preference: genderPreference,
        ...(bookForSomeoneElse && passengerName.trim() ? { passenger_name: passengerName.trim() } : {}),
        ...(bookForSomeoneElse && passengerPhone.trim() ? { passenger_phone: passengerPhone.trim() } : {}),
        ...(scheduledAt ? { scheduled_at: scheduledAt.toISOString() } : {})
      });
      if (!result.ok) throw new Error(result.error);

      const rideId = result?.ride?.id;
      if (!rideId) {
        throw new Error('Ride was created but no ride ID was returned. Please try again.');
      }

      // Save multi-stops if any
      if (rideStops.length > 0) {
        const stopsToInsert = rideStops.
        filter((s) => s.address?.trim() && Number.isFinite(s.lat) && Number.isFinite(s.lng)).
        map((s, i) => ({
          ride_id: rideId,
          stop_order: i + 1,
          address: s.address,
          latitude: s.lat,
          longitude: s.lng
        }));
        if (stopsToInsert.length > 0) {
          await supabase.from('ride_stops').insert(stopsToInsert);
        }
      }

      setCurrentRideId(rideId);
      toast({
        title: scheduledAt ? 'Ride scheduled!' : 'Offer sent!',
        description: bookForSomeoneElse && passengerName.trim()
          ? `Passenger: ${passengerName.trim()}${passengerPhone.trim() ? ` (${passengerPhone.trim()})` : ''}`
          : `${fareEstimate.currencySymbol}${customFare} — ${scheduledAt ? 'scheduled for later' : 'waiting for drivers…'}`,
      });
      if (!scheduledAt) {
        setRideStatus('searching');
        setSearchStartedAt(Date.now());
      } else
      {setRideStatus('idle');setScheduledAt(null);setRideStops([]);}
    } catch (error: unknown) {toast({ title: 'Failed to send offer', description: (error as Error).message, variant: 'destructive' });setRideStatus('idle');} finally {setIsRequesting(false);}
  };

  const handleAddStop = () => {
    if (rideStops.length >= 3) return;
    setRideStops((prev) => [...prev, { id: crypto.randomUUID(), address: '', lat: 0, lng: 0 }]);
  };

  const handleRemoveStop = (id: string) => {
    setRideStops((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStopClick = (id: string) => {
    setActiveStopId(id);
    setActiveField('dropoff'); // Reuse search overlay
    setSearchQuery('');
  };

  const handleAcceptOffer = async (offerId: string) => {
    const selectedOffer = offers.find((o) => o.offerId === offerId);
    if (!selectedOffer || !currentRideId) return;

    const sb = supabase as unknown as {
      from: (table: string) => {
        update: (values: Record<string, unknown>) => {
          eq: (column: string, value: string) => {
            neq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    };

    try {
      await sb.from('ride_offers').update({ status: 'accepted' }).eq('id', offerId).neq('id', '__never__');
      await sb
        .from('ride_offers')
        .update({ status: 'rejected' })
        .eq('ride_request_id', currentRideId)
        .neq('id', offerId);

      setRideStatus('driver_assigned');
      toast({ title: 'Driver accepted!' });
      setMatchedDriver({
        name: selectedOffer.driverName || selectedOffer.name,
        car: selectedOffer.vehicleMake && selectedOffer.vehicleModel ? `${selectedOffer.vehicleMake} ${selectedOffer.vehicleModel}` : selectedOffer.vehicleType,
        plate: selectedOffer.plateNumber,
        rating: selectedOffer.ratingAvg ?? 4.5,
        eta: selectedOffer.etaMinutes,
        avatar: selectedOffer.avatarUrl || undefined,
      });
      setTimeout(() => setRideStatus('driver_arriving'), 2000);
    } catch (error) {
      toast({ title: 'Could not accept offer', description: error instanceof Error ? error.message : 'Please try again', variant: 'destructive' });
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    const sb = supabase as unknown as {
      from: (table: string) => {
        update: (values: Record<string, unknown>) => {
          eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };

    try {
      await sb.from('ride_offers').update({ status: 'rejected' }).eq('id', offerId);
      setOffers((prev) => prev.filter((o) => o.offerId !== offerId));
    } catch (error) {
      toast({ title: 'Could not decline offer', description: error instanceof Error ? error.message : 'Please try again', variant: 'destructive' });
    }
  };
  const handleCancelRide = async () => {if (currentRideId) await supabase.from('rides').update({ status: 'cancelled' }).eq('id', currentRideId);setRideStatus('idle');setCurrentRideId(null);setOffers([]);setViewingDrivers([]);setMatchedDriver(null);toast({ title: 'Ride cancelled' });};

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length >= 2) {searchGoogle(value);}
    if (value.trim().length >= 3) {handleNominatimSearch(value);} else {setNominatimResults([]);}
    if (value.trim().length < 2) {clearGoogleSuggestions();}
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

  const extraPassengers = Math.max(passengerCount - 3, 0);
  const extraPassengerFee = extraPassengers * 0.5;
  const totalFare = fareEstimate
    ? townPricing.base_fare + (fareEstimate.fareR - townPricing.base_fare) + extraPassengerFee
    : null;
  const viewedDriversCount = viewerCount;
  const remainingSeconds = searchStartedAt
    ? Math.max(0, 180 - Math.floor((Date.now() - searchStartedAt) / 1000))
    : 180;
  const effectiveSearchFare = searchFare ?? totalFare ?? fareEstimate?.fareR ?? 0;
  const fareQualityText = fareEstimate && effectiveSearchFare >= fareEstimate.fareR + 1
    ? 'Excellent fare. Better chance to get offers'
    : fareEstimate && effectiveSearchFare >= fareEstimate.fareR
      ? 'Good fare. Your request gets priority'
      : 'Fair fare. Raise slightly for faster matching';
  const activityCards = useMemo(() => {
    return [
      viewedDriversCount > 0
        ? `${viewedDriversCount} driver${viewedDriversCount === 1 ? '' : 's'} viewing your request`
        : 'Waiting for drivers to view your request',
      offers.length > 0
        ? `${offers.length} live offer${offers.length === 1 ? '' : 's'} received`
        : 'Live offers will appear here once drivers respond'
    ];
  }, [viewedDriversCount, offers]);
  const inlineOffers = useMemo(() => offers.slice(0, 6), [offers]);

  // ═══════════════════════════════════════════
  // DRIVER MATCHED VIEW
  // ═══════════════════════════════════════════
  if (matchedDriver && (rideStatus === 'driver_assigned' || rideStatus === 'driver_arriving')) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
        <div className="absolute inset-0">
          <MapGoogle pickup={pickupLocation} dropoff={dropoffLocation} routeGeometry={routeData?.geometry} defaultCenter={safeTown.center} defaultZoom={14} className="w-full h-full" height="100%" />
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

        {/* ETA pill - animated */}
        <motion.div
          initial={{ y: -30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
          className="absolute top-24 left-4 right-4 z-30">
          
          <div className="glass-card-heavy p-5 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Matched driver
            </div>
            <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--gradient-primary)' }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
              
              <Clock className="w-7 h-7 text-primary-foreground" />
            </motion.div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Arriving in</p>
              <motion.p
                key={matchedDriver.eta}
                initial={{ scale: 1.2, color: 'hsl(45 100% 51%)' }}
                animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                className="text-3xl font-bold font-display text-foreground tabular-nums">
                
                {matchedDriver.eta} <span className="text-lg font-medium text-muted-foreground">min</span>
              </motion.p>
            </div>
            </div>
          </div>
        </motion.div>

        {/* Driver card bottom - slide up animation */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.4 }}
          className="absolute bottom-0 left-0 right-0 z-50">
          
          <div className="glass-card-heavy rounded-t-[28px] px-4 pt-4 pb-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
            <div className="w-10 h-1 rounded-full bg-foreground/10 mx-auto mb-4" />
            <div className="flex items-center gap-3 mb-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.6 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center ring-2 ring-primary/20 shrink-0"
                style={{ background: 'var(--gradient-primary)' }}>
                
                <User className="w-7 h-7 text-primary-foreground" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold font-display text-foreground truncate">{matchedDriver.name}</p>
                <p className="text-sm text-muted-foreground truncate">{matchedDriver.car} · {matchedDriver.plate}</p>
              </div>
              <div className="flex items-center gap-1 glass-card rounded-full px-3 py-1.5 glass-glow-yellow shrink-0">
                <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                <span className="text-sm font-bold text-foreground">{matchedDriver.rating}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 mb-4">
              <div className="glass-card rounded-xl px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pickup</p>
                <p className="text-sm font-medium text-foreground truncate">{pickupLocation?.name || '—'}</p>
              </div>
              <div className="glass-card rounded-xl px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Drop-off</p>
                <p className="text-sm font-medium text-foreground truncate">{dropoffLocation?.name || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
              { icon: Phone, label: 'Call', bg: 'var(--gradient-primary)', textClass: 'text-primary-foreground' },
              { icon: MessageCircle, label: 'Message', bg: undefined, textClass: 'text-primary' },
              { icon: X, label: 'Cancel', bg: undefined, textClass: 'text-destructive' }].
              map((action, i) =>
              <motion.button
                key={action.label}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.1, type: 'spring', stiffness: 400, damping: 25 }}
                onClick={action.label === 'Cancel' ? handleCancelRide : undefined}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3 rounded-2xl active:scale-95 transition-all',
                  action.bg ? '' : action.label === 'Cancel' ? 'bg-destructive/8' : 'glass-card'
                )}
                style={action.bg ? { background: action.bg } : undefined}>
                
                  <action.icon className={cn('w-5 h-5', action.textClass)} />
                  <span className={cn('text-[11px] font-medium', action.bg ? 'text-primary-foreground' : action.textClass)}>{action.label}</span>
                </motion.button>
              )}
            </div>
            <div className="mt-3 flex justify-center">
              {currentRideId && pickupLocation && dropoffLocation && (
                <div className="mr-2">
                  <ShareTripButton
                    rideId={currentRideId}
                    pickupAddress={pickupLocation.name}
                    dropoffAddress={dropoffLocation.name}
                    driverName={matchedDriver.name}
                  />
                </div>
              )}
              <EmergencyButton
                rideId={currentRideId ?? undefined}
                pickupAddress={pickupLocation?.name}
                dropoffAddress={dropoffLocation?.name}
                driverName={matchedDriver.name} />
              
            </div>
          </div>
        </motion.div>
      </div>);
  }

  if (rideStatus === 'searching' && pickupLocation && dropoffLocation) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
        <div className="absolute inset-0">
          <MapGoogle pickup={pickupLocation} dropoff={dropoffLocation} routeGeometry={routeData?.geometry} defaultCenter={safeTown.center} defaultZoom={14} className="w-full h-full" height="100%" drivers={nearbyDrivers} />
        </div>

        <div className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, hsl(217 85% 29% / 0.14), transparent)' }} />

        <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
          <button onClick={handleCancelRide} className="w-12 h-12 flex items-center justify-center rounded-full glass-card active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <VoyexLogo size="sm" />
          <div className="w-12" />
        </div>

        <div className="absolute left-4 right-4 z-30 space-y-2" style={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {[0, 1].map((idx) => (
              <motion.div
                key={`${activityCards[idx]}-${idx}`}
                initial={prefersReducedMotion ? { opacity: 0 } : { y: -10, opacity: 0, scale: 0.98 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { y: -8, opacity: 0, scale: 0.98 }}
                transition={{ duration: prefersReducedMotion ? 0.15 : 0.28 }}
                className="glass-card rounded-2xl px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.span
                    className="w-2 h-2 rounded-full bg-accent"
                    animate={prefersReducedMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                  />
                  <p className="text-xs font-medium text-foreground">{activityCards[idx]}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">Live</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <GlassSheet
          className="absolute left-3 right-3 z-50 flex flex-col"
          style={{
            bottom: 8,
            height: '50vh',
            transition: 'height 0.3s cubic-bezier(0.32,0.72,0,1)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28
          }}>
          <div className="w-full py-3 flex justify-center shrink-0 rounded-t-[28px]" style={{ background: 'var(--gradient-primary)' }}>
            <div className="w-12 h-1.5 rounded-full bg-primary-foreground/40" />
          </div>

          <div className="flex-1 px-4 pb-3 space-y-3 overflow-y-auto">
            <div className="glass-card rounded-2xl p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-primary font-bold">Live matching</p>
                  <p className="text-[20px] leading-tight font-black text-foreground mt-0.5">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={viewedDriversCount}
                        initial={prefersReducedMotion ? { opacity: 0 } : { y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { y: -8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="inline-block min-w-[16px] text-primary"
                      >
                        {viewedDriversCount}
                      </motion.span>
                    </AnimatePresence>{' '}
                    driver{viewedDriversCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">viewing your request right now</p>
                  <div className="mt-2 flex -space-x-2">
                    {Array.from({ length: Math.max(1, Math.min(4, viewedDriversCount || 1)) }).map((_, i) => (
                      <motion.div
                        key={`${i}-${viewedDriversCount}`}
                        initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.85, y: 4, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.16) }}
                        className="w-8 h-8 rounded-full border-2 border-background bg-primary/15 flex items-center justify-center text-primary text-[10px] font-bold">
                        {viewingDrivers[i]?.name?.[0] || offers[i]?.driverName?.[0] || 'V'}
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="text-right glass-card rounded-xl px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Request timer</p>
                  <p className="text-lg font-bold text-primary tabular-nums">{Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}</p>
                </div>
              </div>
              {(viewingDrivers.length > 0 || offers.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {viewingDrivers.slice(0, 4).map((d, i) => (
                    <span key={`${d.driverId || d.name}-${i}`} className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium truncate max-w-[140px]">
                      {d.name} · {d.etaMinutes}m
                    </span>
                  ))}
                </div>
              )}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={fareQualityText}
                  initial={prefersReducedMotion ? { opacity: 0 } : { y: 6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { y: -6, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="mt-3 rounded-xl bg-accent/20 px-3 py-2 text-xs font-semibold text-accent-foreground inline-flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" /> {fareQualityText}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="glass-card rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Adjust fare</p>
                <p className="text-xs text-muted-foreground">Step {fareEstimate?.currencySymbol || '$'}0.50</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setSearchFare((f) => Math.max(0, (f ?? effectiveSearchFare) - 0.5))}
                  className="w-10 h-10 rounded-full glass-card flex items-center justify-center active:scale-90 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="text-2xl font-black font-display text-primary min-w-[120px] text-center">
                  {(fareEstimate?.currencySymbol || '$')}{effectiveSearchFare.toFixed(2)}
                </div>
                <button
                  onClick={() => setSearchFare((f) => (f ?? effectiveSearchFare) + 0.5)}
                  className="w-10 h-10 rounded-full glass-card flex items-center justify-center active:scale-90 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <PrimaryButton
                onClick={() => toast({ title: 'Fare updated', description: `Matching with ${fareEstimate?.currencySymbol || '$'}${effectiveSearchFare.toFixed(2)}` })}
                className="w-full h-11 rounded-xl"
              >
                Raise Fare
              </PrimaryButton>
            </div>

            <div className="glass-card rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Offers received</p>
                  <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {inlineOffers.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Live</p>
              </div>

              {inlineOffers.length === 0 ? (
                <div className="rounded-xl bg-muted/50 px-3 py-3 text-xs text-muted-foreground border border-dashed border-border">
                  Waiting for offers… Drivers who like your fare will appear here instantly.
                </div>
              ) : (
                <div className="max-h-[42vh] overflow-y-auto space-y-2 pr-1">
                  <AnimatePresence initial={false}>
                    {inlineOffers.map((o, idx) => (
                      <motion.div
                        key={o.offerId}
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.985 }}
                        transition={{ duration: 0.22, delay: Math.min(idx * 0.03, 0.15) }}
                        className="rounded-2xl border border-white/40 bg-white/75 backdrop-blur-sm p-3 shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                              {o.avatarUrl ? (
                                <img src={o.avatarUrl} alt={o.driverName || o.name || 'Driver'} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-primary">{(o.driverName || o.name || 'D').charAt(0)}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{o.driverName || o.name || 'Driver'}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {o.ratingAvg ? `${Number(o.ratingAvg).toFixed(1)} ★` : 'New'} · ETA {o.etaMinutes} min
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fare</p>
                            <p className="text-base font-black text-primary">${o.offeredFareR.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleAcceptOffer(o.offerId)}
                            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineOffer(o.offerId)}
                            className="flex-1 h-9 rounded-xl bg-muted text-foreground text-sm font-medium"
                          >
                            Decline
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Auto-accept</p>
                  <p className="text-xs text-muted-foreground">Auto-accept an offer of {(fareEstimate?.currencySymbol || '$')}{effectiveSearchFare.toFixed(2)} up to {autoAcceptMaxEta} min away</p>
                </div>
                <button
                  onClick={() => setAutoAcceptEnabled((v) => !v)}
                  className={cn('h-7 w-12 rounded-full transition-colors', autoAcceptEnabled ? 'bg-primary' : 'bg-muted')}>
                  <span className={cn('block h-6 w-6 rounded-full bg-white transition-transform', autoAcceptEnabled ? 'translate-x-6' : 'translate-x-0')} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setAutoAcceptMaxEta((v) => Math.max(3, v - 1))} className="w-7 h-7 rounded-full glass-card flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                <span className="text-xs font-medium text-foreground">Max ETA: {autoAcceptMaxEta} min</span>
                <button onClick={() => setAutoAcceptMaxEta((v) => Math.min(15, v + 1))} className="w-7 h-7 rounded-full glass-card flex items-center justify-center"><Plus className="w-3 h-3" /></button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Payment</p>
              <div className="flex gap-2">
                {[{ key: 'cash' as const, icon: Banknote, label: 'Cash' }, { key: 'ecocash' as const, icon: Phone, label: 'EcoCash' }, { key: 'wallet' as const, icon: Wallet, label: 'Wallet' }].map((pm) =>
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

            <div className="grid grid-cols-1 gap-2">
              <div className="glass-card rounded-xl px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pickup</p>
                <p className="text-sm font-medium truncate">{pickupLocation.name}</p>
              </div>
              <div className="glass-card rounded-xl px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Drop-off</p>
                <p className="text-sm font-medium truncate">{dropoffLocation.name}</p>
              </div>
            </div>

            <button onClick={handleCancelRide} className="w-full h-11 rounded-xl bg-destructive/10 text-destructive font-semibold">
              Cancel Request
            </button>
          </div>
        </GlassSheet>

      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MAIN RIDE BOOKING UI
  // ═══════════════════════════════════════════
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* ── MAP ── */}
      <div className="absolute inset-0">
        <MapGoogle pickup={pickupLocation} dropoff={dropoffLocation} routeGeometry={routeData?.geometry} onMapClick={handleMapClick} defaultCenter={safeTown.center} defaultZoom={14} className="w-full h-full" height="100%" drivers={nearbyDrivers} />

        {/* Floating map buttons */}
        <div className="absolute right-3 z-20" style={{ bottom: sheetExpanded ? 'calc(70vh + 16px)' : 'calc(48vh + 16px)', transition: 'bottom 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
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
        <button onClick={() => setMenuOpen(true)} className="w-12 h-12 flex items-center justify-center rounded-full bg-card shadow-sm active:scale-95 transition-all">
          <Menu className="w-5 h-5 text-primary" />
        </button>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => user ? navigate(location.pathname.startsWith('/mapp') ? '/mapp/profile' : '/profile') : setAuthModalOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-card shadow-sm active:scale-95 transition-all">
            <User className="w-5 h-5 text-primary" />
          </button>
        </div>
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
              onClick={() => {setMenuOpen(false);navigate(location.pathname.startsWith('/mapp') ? '/mapp/wallet' : '/wallet');}}
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

            <div className="border-t border-border/30 my-1 mx-2" />
            <p className="px-4 pt-1 pb-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Services</p>

            {SERVICE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {setMenuOpen(false);setServiceType(tab.id);}}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left hover:bg-muted active:scale-[0.98] transition-all",
                  serviceType === tab.id && "bg-primary/10"
                )}>
                <span className="text-lg">{tab.icon}</span>
                <span className={cn("text-[15px] font-semibold", serviceType === tab.id ? "text-primary" : "text-foreground")}>{tab.label}</span>
                {serviceType === tab.id && <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>}
              </button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* ── BOTTOM SHEET ── */}
      <GlassSheet
        className="absolute left-3 right-3 z-50 flex flex-col"
        style={{
          bottom: 8,
          height: sheetExpanded ? '74vh' : '56vh',
          transition: 'height 0.3s cubic-bezier(0.32,0.72,0,1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28
        }}>
        
        {/* Blue ribbon handle bar */}
        <button
          onClick={() => setSheetExpanded((e) => !e)}
          className="w-full py-3 flex justify-center shrink-0 rounded-t-[28px]"
          style={{ background: 'var(--gradient-primary)' }}>
          <div className="w-12 h-1.5 rounded-full bg-primary-foreground/40" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 px-4 pb-2 space-y-2.5 min-h-0 overflow-y-auto overscroll-contain">

          {/* Service type indicator */}
          {serviceType !== 'ride' && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                {SERVICE_TABS.find(t => t.id === serviceType)?.icon} {SERVICE_TABS.find(t => t.id === serviceType)?.label} Mode
              </span>
              <button onClick={() => setServiceType('ride')} className="text-xs text-muted-foreground underline">Switch to Ride</button>
            </div>
          )}

          {/* Town selector row */}
          <div className="flex items-center justify-between">
            <TownSelectorSheet
              currentTown={safeTown}
              onSelect={(town) => {
                setSelectedTown(town ?? DEFAULT_TOWN);
                setPickupLocation(null);
                setDropoffLocation(null);
              }}
            />
            <p className="text-[10px] text-muted-foreground">{safeTown.radiusKm}km area</p>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton
              onClick={() => {
                setActiveField(activeField ?? 'dropoff');
                setSearchQuery('Home');
              }}
              className="h-12 rounded-2xl gap-2"
            >
              <Home className="h-4 w-4" /> Home
            </SecondaryButton>
            <SecondaryButton
              onClick={() => {
                setActiveField(activeField ?? 'dropoff');
                setSearchQuery('Work');
              }}
              className="h-12 rounded-2xl gap-2"
            >
              <Briefcase className="h-4 w-4" /> Work
            </SecondaryButton>
          </div>

          {/* Pickup & Dropoff — premium cards with swap */}
          <div className="space-y-2 relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {setActiveField('pickup');setSearchQuery('');}}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveField('pickup');
                  setSearchQuery('');
                }
              }}
              className="w-full min-h-[62px] flex items-center gap-3 px-3 py-3 rounded-2xl active:scale-[0.98] transition-all text-left glass-card cursor-pointer">
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
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {e.stopPropagation();handleUseMyLocation();}}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUseMyLocation();
                  }
                }}
                className="p-1.5 hover:bg-foreground/5 rounded-full cursor-pointer"
              ><Locate className="w-3.5 h-3.5 text-primary" /></span>
              }
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => {setActiveField('dropoff');setSearchQuery('');}}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveField('dropoff');
                  setSearchQuery('');
                }
              }}
              className="w-full min-h-[62px] flex items-center gap-3 px-3 py-3 rounded-2xl active:scale-[0.98] transition-all text-left glass-card cursor-pointer">
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
            </div>

            <button
              onClick={handleSwapPickupDropoff}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl glass-card flex items-center justify-center text-primary active:scale-90 transition-all"
              title="Swap pickup and drop-off"
              aria-label="Swap pickup and drop-off"
            >
              <Route className="w-4 h-4" />
            </button>
          </div>

          {/* Multi-stop + Schedule */}
          <MultiStopInput
            stops={rideStops}
            onAddStop={handleAddStop}
            onRemoveStop={handleRemoveStop}
            onStopClick={handleStopClick} />

          <div className="glass-card rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold">Schedule</p>
            </div>
            <ScheduleRide scheduledAt={scheduledAt} onSchedule={setScheduledAt} />
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

          <div className='glass-card rounded-2xl p-3 space-y-3'>
            <div className='flex items-center justify-between'>
              <p className='text-xs font-semibold'>Book for someone else</p>
              <button onClick={() => setBookForSomeoneElse((v) => !v)} className={cn('h-7 w-12 rounded-full transition-colors', bookForSomeoneElse ? 'bg-primary' : 'bg-muted')}>
                <span className={cn('block h-6 w-6 rounded-full bg-white transition-transform', bookForSomeoneElse ? 'translate-x-6' : 'translate-x-0')} />
              </button>
            </div>
            {bookForSomeoneElse && (
              <>
                <div className='grid grid-cols-1 gap-2'>
                  <InputField placeholder='Passenger name' value={passengerName} onChange={(e) => setPassengerName(e.target.value)} />
                  <InputField placeholder='Passenger phone' value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} />
                </div>
                <IconPillButton onClick={handlePickPassengerFromContacts}><ContactRound className='w-4 h-4' />Pick from contacts</IconPillButton>
                <p className='text-xs text-muted-foreground'>Driver can contact this passenger.</p>
              </>
            )}
          </div>

          {/* Women-only ride toggle */}
          <GenderPreferenceToggle value={genderPreference} onChange={setGenderPreference} />

          {/* ── Fare + payment (expanded) ── */}
          {pickupLocation && dropoffLocation && fareEstimate && (() => {
            const baseFare = townPricing.base_fare;
            const distanceFare = fareEstimate.fareR - baseFare;
            const finalFare = baseFare + distanceFare + extraPassengerFee;
            const sym = fareEstimate.currencySymbol;
            const fmt = (v: number) => `${sym}${v.toFixed(2)}`;

            return (
              <>
                <div className="glass-card rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Trip estimate</p>
                    <p className="text-sm font-bold text-primary">{fmt(finalFare)}</p>
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between"><span>Base fare</span><span>{fmt(baseFare)}</span></div>
                    <div className="flex items-center justify-between"><span>Distance & time</span><span>{fmt(distanceFare)}</span></div>
                    {extraPassengerFee > 0 && (
                      <div className="flex items-center justify-between"><span>Extra passengers</span><span>{fmt(extraPassengerFee)}</span></div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Payment</p>
                  <div className="flex gap-2">
                    {[{ key: 'cash' as const, icon: Banknote, label: 'Cash' }, { key: 'ecocash' as const, icon: Phone, label: 'EcoCash' }, { key: 'wallet' as const, icon: Wallet, label: 'Wallet' }].map((pm) =>
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
            );
          })()}
        </div>

        {/* ── PINNED FIND DRIVERS BUTTON ── always visible at bottom */}
        <div className="shrink-0 px-4 pb-3 pt-2">
          {pickupLocation && dropoffLocation && fareEstimate && totalFare !== null ? (() => {
            const sym = fareEstimate.currencySymbol;
            const fmt = (v: number) => `${sym}${v.toFixed(2)}`;
            return (
              <PrimaryButton
                onClick={() => handleSendOffer(totalFare)}
                disabled={isRequesting}
                className="w-full h-[52px] text-[15px] font-semibold rounded-2xl gap-2 inline-flex items-center justify-center shadow-[0_10px_30px_hsl(217_85%_29%/0.35)]">
                
                {isRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
                {isRequesting ? 'Finding Drivers…' : `Find Drivers • ${fmt(totalFare)}`}
              </PrimaryButton>);

          })() :
          <SecondaryButton
            disabled
            className="w-full h-[48px] text-[15px] font-semibold rounded-2xl bg-primary/40 text-primary-foreground border-transparent">
              {pickupLocation && dropoffLocation ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Calculating…</> : 'Find Drivers'}
            </SecondaryButton>
          }
        </div>
      </GlassSheet>


      {/* ═══ SEARCH OVERLAY ═══ */}
      {activeField &&
      <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'hsl(var(--background) / 0.97)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}>
          {/* Search sheet — full screen */}
          <div className="flex-1 flex flex-col overflow-hidden">
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

            {/* Show town places by default when no search query */}
            {!searchQuery.trim() &&
            <>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    📍 Places in {safeTown.name}
                  </p>
                </div>
                {landmarksLoading ?
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> :
              landmarks.length > 0 ?
              landmarks.map((landmark) =>
              <button key={landmark.id} onClick={() => handleLandmarkSelect(landmark)} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-primary/5 transition-colors border-b border-border/15 text-left">
                      <div className="w-10 h-10 rounded-2xl glass-card flex items-center justify-center shrink-0">
                        <MapPin className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate text-sm">{landmark.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{landmark.category}{landmark.distance ? ` · ${landmark.distance < 1 ? `${Math.round(landmark.distance * 1000)}m` : `${landmark.distance.toFixed(1)}km`}` : ''}</p>
                      </div>
                    </button>
              ) :

              <p className="text-sm text-muted-foreground text-center py-6">No places found in {safeTown.name}</p>
              }
              </>
            }

            {searchQuery.trim().length >= 2 &&
            <>
                {/* Single unified section: Streets & Places */}
                <div className="px-4 py-2 bg-accent/8 border-t border-border/15">
                  <p className="text-[11px] font-semibold text-foreground uppercase tracking-widest">🌍 Streets & Places</p>
                </div>

                {(landmarksLoading || googleLoading || nominatimLoading) && landmarks.length === 0 && googleSuggestions.length === 0 && nominatimResults.length === 0 &&
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Searching places…</span></div>
              }

                {/* Landmark results */}
                {landmarks.map((landmark) =>
              <button key={landmark.id} onClick={() => handleLandmarkSelect(landmark)} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-primary/5 transition-colors border-b border-border/15 text-left">
                      <div className="w-11 h-11 rounded-2xl glass-card flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{landmark.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{landmark.category}{landmark.distance ? ` · ${landmark.distance < 1 ? `${Math.round(landmark.distance * 1000)}m` : `${landmark.distance.toFixed(1)}km`}` : ''}</p>
                      </div>
                    </button>
              )}

                {/* Google Places results */}
                {googleSuggestions.map((suggestion) =>
              <button key={suggestion.placeId} onClick={() => handleGooglePlaceSelect(suggestion)} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-accent/5 transition-colors border-b border-border/15 text-left">
                      <div className="w-11 h-11 rounded-2xl bg-accent/12 flex items-center justify-center shrink-0">
                        <Search className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{suggestion.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{suggestion.description}</p>
                      </div>
                    </button>
              )}

                {/* Nominatim fallback results */}
                {nominatimResults.map((result, index) =>
              <button key={`nom-${index}`} onClick={() => handleNominatimSelect(result)} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-primary/5 transition-colors border-b border-border/15 text-left">
                      <div className="w-11 h-11 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0">
                        <Navigation className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{result.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{result.displayName}</p>
                      </div>
                    </button>
              )}

                {/* Empty state */}
                {!landmarksLoading && !googleLoading && !nominatimLoading && landmarks.length === 0 && googleSuggestions.length === 0 && nominatimResults.length === 0 && searchQuery.trim().length >= 2 &&
              <div className="text-center py-12 text-muted-foreground">
                      <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No results for "{searchQuery}"</p>
                    </div>
              }
              </>
            }
          </div>
          </div>
        </div>
      }

      {/* Modals */}
      <AuthModalWrapper isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} mode={authMode} onSwitchMode={() => setAuthMode((m) => m === 'login' ? 'signup' : 'login')} />
    </div>);

}