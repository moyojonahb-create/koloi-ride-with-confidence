import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { completeTrip } from "@/lib/completeTrip";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useRideRealtime } from "@/hooks/useRideRealtime";
import { useDriverTracking } from "@/hooks/useDriverTracking";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { getSecondsRemaining } from "@/lib/rideExpiry";
import {
  fetchPendingOffers,
  fetchDriversByIds,
  acceptOffer,
  declineOffer,
  type Offer,
  type DriverProfile
} from "@/lib/offerHelpers";
import { RideCommunication } from "@/components/ride/RideCommunication";
import OffersModal from "@/components/OffersModal";
import MapGoogle from "@/components/MapGoogle";
import TripGoogleMap from "@/components/TripGoogleMap";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Users, Eye, Minus, Plus, MessageCircle, Phone, Clock, Star, Shield } from "lucide-react";
import DriverETABanner from "@/components/ride/DriverETABanner";
import CancellationPolicy from "@/components/ride/CancellationPolicy";
import EmergencyButton from "@/components/ride/EmergencyButton";
import DriverRatingModal from "@/components/ride/DriverRatingModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { playAcceptedSound, playNewRequestSound, playArrivedSound, playCompletedSound } from "@/lib/notificationSounds";
import SearchingOverlay from "@/components/ride/SearchingOverlay";
import RideCompleteSummary from "@/components/ride/RideCompleteSummary";
import { haptic } from "@/lib/haptics";
import IncomingCallModal from "@/components/ride/IncomingCallModal";
import ActiveCallOverlay from "@/components/ride/ActiveCallOverlay";
import VoiceCallButton from "@/components/ride/VoiceCallButton";
import ShareTripButton from "@/components/ride/ShareTripButton";
import EcoCashPaymentModal from "@/components/wallet/EcoCashPaymentModal";
import { useWallet } from "@/hooks/useWallet";

type Ride = {
  id: string;
  user_id: string;
  driver_id: string | null;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lon: number;
  dropoff_lat: number;
  dropoff_lon: number;
  fare: number;
  distance_km: number;
  duration_minutes: number;
  expires_at?: string | null;
  route_polyline?: string | null;
};

export default function RiderRideDetail() {
  const { rideId } = useParams<{rideId: string;}>();
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [ride, setRide] = useState<Ride | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [driversById, setDriversById] = useState<Record<string, DriverProfile>>({});
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [driverPhone, setDriverPhone] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingFare, setUpdatingFare] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);
  const [lastOfferCount, setLastOfferCount] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [showEcoCashPay, setShowEcoCashPay] = useState(false);

  const { balance: walletBalance } = useWallet();
  const [walletPin, setWalletPin] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('wallets').select('wallet_pin').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setWalletPin((data as Record<string, unknown>)?.wallet_pin as string | null); });
  }, [user]);

  const {
    callStatus, isMuted, isSpeaker, callDuration, incomingCall,
    startCall, answerCall, declineCall: declineIncomingCall, endCall,
    toggleMute, toggleSpeaker
  } = useWebRTCCall({
    rideId: rideId ?? null,
    currentUserId: user?.id ?? "",
    otherUserId: (driverProfile as Record<string, unknown>)?.user_id as string ?? null
  });

  const refreshRide = useCallback(async () => {
    if (!rideId) return;
    const { data, error } = await supabase.from("rides").select("*").eq("id", rideId).single();
    if (error) { setError(error.message); return; }

    const wasAccepted = ride?.status !== "accepted" && data.status === "accepted";
    const wasArrived = ride?.status !== "driver_arrived" && ride?.status !== "arrived" && (data.status === "driver_arrived" || data.status === "arrived");
    const wasCompleted = ride?.status !== "completed" && data.status === "completed";
    setRide(data as Ride);

    if (wasAccepted) {
      playAcceptedSound();
      haptic('medium');
      try {
        if (typeof globalThis.Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("🎉 Driver Accepted!", { body: "Your ride has been confirmed.", icon: "/icons/icon-192x192.png" });
        }
      } catch (_) {}
    }

    if (wasArrived) {
      playArrivedSound();
      haptic('heavy');
      try {
        if (typeof globalThis.Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("📍 Driver Has Arrived!", { body: "Your driver is waiting at the pickup point.", icon: "/icons/icon-192x192.png" });
        }
      } catch (_) {}
    }

    if (wasCompleted) {
      playCompletedSound();
      haptic('medium');
      if (!hasRated) setShowRating(false);
    }

    if (data.driver_id && (data.status === "accepted" || data.status === "in_progress" || data.status === "arrived")) {
      try {
        const { data: driverData } = await supabase.from("drivers").select("*").eq("id", data.driver_id).maybeSingle();
        if (driverData) {
          setDriverProfile(driverData);
          const { data: profileData } = await supabase.from("profiles").select("full_name, phone").eq("user_id", driverData.user_id).maybeSingle();
          if (profileData?.phone) setDriverPhone(profileData.phone);
        }
      } catch (e: unknown) { console.warn("Error fetching driver details:", (e as Error).message); }
    }
  }, [rideId, ride?.status]);

  const refreshOffers = useCallback(async () => {
    if (!rideId) return;
    try {
      const list = await fetchPendingOffers(rideId);
      if (list.length > lastOfferCount && lastOfferCount > 0) {
        playNewRequestSound();
        try {
          if (typeof globalThis.Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("New Driver Offer!", { body: "A driver has made an offer.", icon: "/icons/icon-192x192.png" });
          }
        } catch (_) {}
      }
      setLastOfferCount(list.length);
      setOffers(list);
      const ids = [...new Set(list.map((o) => o.driver_id))];
      const map = await fetchDriversByIds(ids);
      setDriversById(map);
    } catch (e: unknown) { console.error("Failed to fetch offers:", e); }
  }, [rideId, lastOfferCount]);

  useRideRealtime(rideId ?? null, { onRideChange: refreshRide, onOfferChange: refreshOffers });

  useEffect(() => {
    try {
      if (typeof globalThis.Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch (_) {}
  }, []);

  const driverLocation = useDriverTracking(
    (driverProfile as Record<string, unknown>)?.user_id as string ?? null,
    ride?.status ?? null
  );

  const isPendingStatus = ride?.status === "pending";
  const nearbyDrivers = useNearbyDrivers(isPendingStatus);

  useEffect(() => {
    if (!ride || ride.status !== "pending" || !ride.expires_at) return;
    const updateCountdown = () => {
      const secs = getSecondsRemaining(ride.expires_at ?? null);
      setSecondsLeft(secs);
      if (secs <= 0 && ride.status === "pending") {
        toast.info("Ride request expired", { description: "Your request timed out." });
        nav("/ride");
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [ride, nav]);

  useEffect(() => {
    if (!authLoading && !user) { nav("/auth"); return; }
    if (!authLoading && rideId) Promise.all([refreshRide(), refreshOffers()]).finally(() => setLoading(false));
  }, [authLoading, user, rideId, nav, refreshRide, refreshOffers]);

  const updateFare = async (newFare: number) => {
    if (!rideId || !ride || ride.status !== "pending") return;
    const clampedFare = Math.max(0.50, Math.round(newFare * 2) / 2);
    if (clampedFare === ride.fare) return;
    setUpdatingFare(true);
    try {
      const { error } = await supabase.from("rides").update({ fare: clampedFare }).eq("id", rideId);
      if (error) throw error;
      setRide({ ...ride, fare: clampedFare });
      toast.success(`Fare updated to $${clampedFare.toFixed(2)}`);
    } catch (e: unknown) { toast.error("Failed to update fare", { description: (e as Error).message }); }
    finally { setUpdatingFare(false); }
  };

  const handleAcceptOffer = async (offerId: string) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer || !rideId) return;
    try {
      setError(null);
      await acceptOffer(rideId, offer);
      setModalOpen(false);
      playAcceptedSound();
      toast.success("Driver accepted!", { description: "You can now contact your driver" });
      await refreshRide();
    } catch (e: unknown) { setError((e as Error).message); toast.error("Failed to accept offer", { description: (e as Error).message }); }
  };

  const handleDeclineOffer = async (offerId: string) => {
    try { await declineOffer(offerId); toast.info("Offer declined"); await refreshOffers(); }
    catch (e: unknown) { toast.error("Failed to decline offer", { description: (e as Error).message }); }
  };

  const handleCancelRide = async () => {
    if (!rideId) return;
    try {
      const { error } = await supabase.from("rides").update({ status: "cancelled" }).eq("id", rideId);
      if (error) throw error;
      toast.info("Ride cancelled");
      nav("/ride");
    } catch (e: unknown) { toast.error("Failed to cancel ride", { description: (e as Error).message }); }
  };

  const modalViewing = offers.map((o) => {
    const d = driversById[o.driver_id];
    return {
      driverId: o.driver_id,
      name: d?.vehicle_make ? `${d.vehicle_make} ${d.vehicle_model}` : "Driver",
      phone: "+263",
      vehicleType: d?.vehicle_type as "Car" | "Taxi" | "Motorbike" || "Car",
      plateNumber: (d?.plate_number as string) || "—",
      languages: ["English"],
      distanceKm: 0,
      etaMinutes: o.eta_minutes || 10
    };
  });

  const modalOffers = offers.map((o) => {
    const d = driversById[o.driver_id];
    const driverFullName = (d as Record<string, unknown>)?.full_name as string | undefined;
    return {
      driverId: o.driver_id,
      name: d?.vehicle_make ? `${d.vehicle_make} ${d.vehicle_model}` : "Driver",
      phone: "+263",
      vehicleType: d?.vehicle_type as "Car" | "Taxi" | "Motorbike" || "Car",
      plateNumber: (d?.plate_number as string) || "—",
      languages: ["English"],
      distanceKm: 0,
      etaMinutes: o.eta_minutes || 10,
      offerId: o.id,
      offeredFareR: o.price,
      createdAt: o.created_at || new Date().toISOString(),
      driverName: driverFullName || (d?.vehicle_make ? `${d.vehicle_make} Driver` : "Driver"),
      vehicleMake: (d?.vehicle_make as string) || undefined,
      vehicleModel: (d?.vehicle_model as string) || undefined,
      gender: (d?.gender as string) || null,
      avatarUrl: (d?.avatar_url as string) || null,
      ratingAvg: ((d as Record<string, unknown>)?.rating_avg as number) || null,
      totalTrips: ((d as Record<string, unknown>)?.total_trips as number) || null
    };
  });

  // ── INSTANT RENDER: Show map immediately, even while loading ──
  const isAccepted = ride ? ["accepted", "in_progress", "arrived"].includes(ride.status) : false;
  const isPending = ride?.status === "pending";

  // Use ride data or fallback coordinates from URL state
  const pickupCoords = ride ? { lat: ride.pickup_lat, lng: ride.pickup_lon } : null;
  const dropoffCoords = ride ? { lat: ride.dropoff_lat, lng: ride.dropoff_lon } : null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Active Call Overlay */}
      {callStatus !== "idle" && (
        <ActiveCallOverlay
          status={callStatus} duration={callDuration} isMuted={isMuted} isSpeaker={isSpeaker}
          onToggleMute={toggleMute} onToggleSpeaker={toggleSpeaker} onEndCall={endCall} otherUserName="Driver" />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal callerId={incomingCall.callerId} onAnswer={answerCall} onDecline={declineIncomingCall} />
      )}

      {/* Map background - ALWAYS rendered, never blank */}
      <div className="absolute inset-0">
        {pickupCoords && isAccepted ? (
          <TripGoogleMap
            driverLocation={driverLocation}
            pickup={pickupCoords}
            dropoff={dropoffCoords!}
            tripStatus={ride!.status}
            height="100%"
            className="w-full h-full"
          />
        ) : pickupCoords ? (
          <MapGoogle
            pickup={pickupCoords}
            dropoff={dropoffCoords!}
            driverLocation={driverLocation}
            drivers={isPending ? nearbyDrivers : undefined}
            routeGeometry={ride?.route_polyline}
            className="w-full h-full"
            height="100%"
          />
        ) : (
          /* Show a default map while ride data loads */
          <MapGoogle
            className="w-full h-full"
            height="100%"
            defaultCenter={{ lat: -20.9408, lng: 29.0147 }}
            defaultZoom={13}
          />
        )}
        <div className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, hsl(217 85% 29% / 0.12), transparent)' }} />
      </div>

      {/* Glass header - always visible */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button onClick={() => nav("/ride")} className="w-11 h-11 flex items-center justify-center rounded-full bg-card shadow-sm active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <div className="bg-card shadow-sm rounded-full px-4 py-2">
          <h1 className="font-bold text-sm text-foreground">Your Ride</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAccepted && (
            <button onClick={() => setShowCommunication(!showCommunication)} className="w-11 h-11 flex items-center justify-center rounded-full bg-card shadow-sm active:scale-95 transition-all">
              <MessageCircle className="w-5 h-5 text-primary" />
            </button>
          )}
          <EmergencyButton />
        </div>
      </div>

      {/* Driver arrived banner */}
      <AnimatePresence>
        {ride && (ride.status === "driver_arrived" || ride.status === "arrived") && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="absolute top-24 left-4 right-4 z-30 bg-primary text-primary-foreground rounded-2xl p-4 flex items-center gap-3 shadow-lg"
          >
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Your driver has arrived!</p>
              <p className="text-xs opacity-80">Head to the pickup point</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-progress reassurance */}
      <AnimatePresence>
        {ride?.status === "in_progress" && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="absolute top-24 left-4 right-4 z-30 bg-card border border-border/40 rounded-2xl p-3 flex items-center gap-3 shadow-sm"
          >
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm font-medium text-foreground">You're on your way safely ✓</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom panel - always visible, content changes with state */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute left-0 right-0 z-50 bg-card max-h-[50vh] overflow-y-auto shadow-[0_-4px_30px_rgba(0,0,0,0.08)]"
        style={{ bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="sticky top-0 pt-3 pb-2 z-10 bg-card" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <div className="w-10 h-1 rounded-full bg-primary mx-auto" />
        </div>

        <div className="px-4 pb-4 space-y-3">
          {/* Loading skeleton - shown briefly while data loads */}
          {loading && !ride && (
            <div className="space-y-3 animate-fade-in">
              <div className="bg-muted rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-accent/50 animate-pulse" />
                    <div className="w-0.5 h-6 bg-border/50" />
                    <div className="w-3 h-3 rounded-full bg-primary/50 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-muted-foreground/10 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-muted-foreground/10 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="bg-muted rounded-2xl p-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-foreground">Connecting to your ride…</span>
                </div>
              </div>
            </div>
          )}

          {/* Ride not found */}
          {!loading && !ride && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Ride not found.</p>
              <Button variant="outline" onClick={() => nav("/ride")} className="mt-3">Back to rides</Button>
            </div>
          )}

          {/* Completed summary */}
          {ride?.status === "completed" && (
            <RideCompleteSummary
              fare={ride.fare}
              distanceKm={ride.distance_km}
              durationMinutes={ride.duration_minutes}
              pickupAddress={ride.pickup_address}
              dropoffAddress={ride.dropoff_address}
              driverName={driverProfile?.vehicle_make ? `${driverProfile.vehicle_make} Driver` : undefined}
              onRate={() => setShowRating(true)}
              onBookAgain={() => nav('/ride', { state: { rebook: { pickup: { name: ride.pickup_address, lat: ride.pickup_lat, lng: ride.pickup_lon }, dropoff: { name: ride.dropoff_address, lat: ride.dropoff_lat, lng: ride.dropoff_lon } } } })}
              onSaveLocation={() => {
                if (user) {
                  supabase.from('favorite_locations').insert({
                    user_id: user.id,
                    name: ride.dropoff_address,
                    address: ride.dropoff_address,
                    latitude: ride.dropoff_lat,
                    longitude: ride.dropoff_lon
                  }).then(() => toast.success('Location saved!'));
                }
              }}
              hasRated={hasRated}
            />
          )}

          {/* Route info + fare - shown when not completed and ride loaded */}
          {ride && ride.status !== "completed" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-4 border border-border/40"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <div className="w-0.5 h-6 bg-border" />
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate text-sm">{ride.pickup_address}</p>
                  <p className="text-sm text-muted-foreground truncate mt-3">{ride.dropoff_address}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your offer</p>
                  {isPending ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateFare(ride.fare - 5)} disabled={updatingFare || ride.fare <= 10}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-black text-xl min-w-[60px] text-center text-foreground">${ride.fare.toFixed(2)}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateFare(ride.fare + 5)} disabled={updatingFare}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="font-black text-xl text-foreground">${ride.fare.toFixed(2)}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</p>
                  <p className="font-semibold capitalize text-primary">{ride.status.replace('_', ' ')}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Enhanced searching experience */}
          {isPending && (
            <SearchingOverlay
              secondsLeft={secondsLeft}
              driversNearby={nearbyDrivers.length}
              offersCount={offers.length}
              onCancel={handleCancelRide}
            />
          )}

          {/* Offers section */}
          {ride && !isAccepted && ride.status !== "completed" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-4 border border-border/40"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground text-sm">Drivers responding</span>
                </div>
                <span className="font-black text-lg text-primary">{offers.length}</span>
              </div>
              <Button
                className="w-full h-[52px] bg-accent hover:bg-accent/90 text-accent-foreground font-bold rounded-2xl shadow-[0_4px_20px_hsl(45_100%_51%/0.3)]"
                onClick={() => setModalOpen(true)}
                disabled={offers.length === 0}>
                <Eye className="h-4 w-4 mr-2" />
                View Offers ({offers.length})
              </Button>
            </motion.div>
          )}

          {/* Cancellation */}
          {ride && ride.status !== "completed" && ride.status !== "cancelled" && ride.status !== "expired" && (
            <CancellationPolicy rideId={ride.id} rideStatus={ride.status} onCancelled={() => nav("/ride")} />
          )}

          {/* Driver card when accepted */}
          {isAccepted && driverProfile && ride && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-card rounded-2xl p-4 border border-primary/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/20">
                  {(driverProfile as Record<string, unknown>).avatar_url ? (
                    <AvatarImage src={(driverProfile as Record<string, unknown>).avatar_url as string} alt="Driver" />
                  ) : null}
                  <AvatarFallback className={`text-sm font-bold ${(driverProfile as Record<string, unknown>).gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-primary/10 text-primary'}`}>
                    {(driverProfile as Record<string, unknown>).gender === 'female' ? '♀' : '♂'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate text-foreground">Your Driver</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {String((driverProfile as Record<string, unknown>).vehicle_make || '')} {String((driverProfile as Record<string, unknown>).vehicle_model || '')} • {String((driverProfile as Record<string, unknown>).plate_number || '')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {((driverProfile as Record<string, unknown>).rating_avg as number) > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-semibold bg-accent/10 rounded-full px-2 py-0.5">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        {Number((driverProfile as Record<string, unknown>).rating_avg).toFixed(1)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {String((driverProfile as Record<string, unknown>).total_trips || 0)} trips
                    </span>
                  </div>
                </div>
              </div>
              {driverPhone && (
                <div className="grid grid-cols-3 gap-2">
                  <VoiceCallButton onCall={startCall} disabled={callStatus !== "idle"} label="Data" className="flex-1 text-xs" />
                  <a href={`tel:${driverPhone}`} className="flex items-center justify-center gap-1 py-3 rounded-2xl font-medium text-xs active:scale-95 transition-all text-center bg-primary text-primary-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>Phone</span>
                  </a>
                  <Button variant="outline" className="rounded-2xl h-auto py-3 text-xs font-medium" onClick={() => setShowCommunication(!showCommunication)}>
                    <MessageCircle className="h-3.5 w-3.5 mr-1 shrink-0" /> Chat
                  </Button>
                </div>
              )}
              {/* Direct EcoCash Payment Option */}
              {(() => {
                const ecocashNum = (driverProfile as Record<string, unknown>)?.ecocash_number as string | undefined;
                const driverName = (driverProfile as Record<string, unknown>)?.vehicle_make 
                  ? `${(driverProfile as Record<string, unknown>)?.vehicle_make} Driver`
                  : 'Driver';
                return (
                  <div className="bg-accent/10 rounded-xl p-3 mt-3 border border-accent/20 space-y-2">
                    <p className="text-xs font-semibold text-accent-foreground">💰 Pay Driver via EcoCash</p>
                    <Button
                      onClick={() => setShowEcoCashPay(true)}
                      className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Pay ${Number(ride.fare).toFixed(2)} with EcoCash
                    </Button>
                    <EcoCashPaymentModal
                      isOpen={showEcoCashPay}
                      onClose={() => setShowEcoCashPay(false)}
                      amount={Number(ride.fare)}
                      currency="$"
                      driverName={driverName}
                      driverEcoCash={ecocashNum}
                      walletPin={walletPin}
                      onVerifyPin={async (pin) => pin === walletPin}
                      onSetPin={async (newPin) => {
                        if (!user) return false;
                        const { error } = await supabase.from('wallets').update({ wallet_pin: newPin }).eq('user_id', user.id);
                        if (!error) { setWalletPin(newPin); return true; }
                        return false;
                      }}
                      onPaymentComplete={() => toast.success('Payment sent to driver!')}
                    />
                  </div>
                );
              })()}

              {/* ETA Banner */}
              {driverLocation && ride.pickup_lat && (
                <div className="rounded-2xl overflow-hidden mt-3 border border-border/40">
                  <DriverETABanner
                    driverLocation={driverLocation}
                    pickupLat={ride.pickup_lat} pickupLng={ride.pickup_lon}
                    dropoffLat={ride.dropoff_lat} dropoffLng={ride.dropoff_lon}
                    rideStatus={ride.status} />
                </div>
              )}
            </motion.div>
          )}

          {/* Communication */}
          {isAccepted && showCommunication && user && ride && (
            <div className="bg-card rounded-2xl p-4 border border-border/40">
              <RideCommunication rideId={ride.id} currentUserId={user.id} otherUserPhone={driverPhone} riderId={ride.user_id} />
            </div>
          )}

          {/* Share Trip */}
          {isAccepted && ride && (
            <ShareTripButton rideId={ride.id} pickupAddress={ride.pickup_address} dropoffAddress={ride.dropoff_address} />
          )}

          {/* Rider complete trip */}
          {isAccepted && ride && (
            <Button
              className="w-full h-[52px] rounded-2xl font-bold text-lg bg-accent hover:bg-accent/90 text-accent-foreground shadow-[0_4px_20px_hsl(45_100%_51%/0.3)]"
              onClick={async () => {
                try {
                  const result = await completeTrip(ride.id);
                  if (result.ok) {
                    toast.success(`Trip completed! Fare: $${Number(result.fare_usd).toFixed(2)}`);
                    refreshRide();
                  } else {
                    toast.error(result.reason || "Could not complete trip");
                  }
                } catch (e: unknown) {
                  toast.error((e as Error)?.message || "Failed to complete trip");
                }
              }}
            >
              ✅ Complete Trip
            </Button>
          )}

          {ride?.status === "completed" && !hasRated && !showRating && ride.driver_id && user && (
            <Button className="w-full h-[52px] gap-2 rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold" onClick={() => setShowRating(true)}>
              <Star className="h-4 w-4" /> Rate Your Driver
            </Button>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>
      </motion.div>

      {/* Modals */}
      {ride && (
        <OffersModal
          isOpen={modalOpen} tripId={ride.id} viewing={modalViewing} offers={modalOffers}
          onAcceptOffer={handleAcceptOffer} onDeclineOffer={handleDeclineOffer}
          onCancelRide={handleCancelRide} onClose={() => setModalOpen(false)} />
      )}

      {showRating && ride?.driver_id && user && (
        <DriverRatingModal
          rideId={ride.id} driverId={ride.driver_id} riderId={user.id}
          driverName={driverProfile ? `${(driverProfile as Record<string, unknown>).vehicle_make || ''} Driver`.trim() : undefined}
          onClose={() => { setShowRating(false); setHasRated(true); }} />
      )}
    </div>
  );
}
