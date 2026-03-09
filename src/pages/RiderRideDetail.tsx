import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useRideRealtime } from "@/hooks/useRideRealtime";
import { useDriverTracking } from "@/hooks/useDriverTracking";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import { useAgoraCall } from "@/hooks/useAgoraCall";
import { getSecondsRemaining, isRideExpired } from "@/lib/rideExpiry";
import {
  fetchPendingOffers,
  fetchDriversByIds,
  acceptOffer,
  declineOffer,
  clampTo5,
  type Offer,
  type DriverProfile
} from "@/lib/offerHelpers";
import { RideCommunication } from "@/components/ride/RideCommunication";
import OffersModal from "@/components/OffersModal";
import MapGoogle from "@/components/MapGoogle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Navigation, Users, Eye, Minus, Plus, MessageCircle, Phone, Clock, Star, Shield } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import DriverETABanner from "@/components/ride/DriverETABanner";
import CancellationPolicy from "@/components/ride/CancellationPolicy";
import EmergencyButton from "@/components/ride/EmergencyButton";
import DriverRatingModal from "@/components/ride/DriverRatingModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { playAcceptedSound, playNewRequestSound } from "@/lib/notificationSounds";
import IncomingCallModal from "@/components/ride/IncomingCallModal";
import ActiveCallOverlay from "@/components/ride/ActiveCallOverlay";
import VoiceCallButton from "@/components/ride/VoiceCallButton";

import TripReceipt from "@/components/ride/TripReceipt";
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
  const [driverProfile, setDriverProfile] = useState<unknown>(null);
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

  // Agora voice calling
  const {
    callStatus, isMuted, isSpeaker, callDuration, incomingCall,
    startCall, answerCall, declineCall: declineIncomingCall, endCall,
    toggleMute, toggleSpeaker
  } = useAgoraCall({
    rideId: rideId ?? null,
    currentUserId: user?.id ?? "",
    otherUserId: (driverProfile as Record<string, unknown>)?.user_id as string ?? null
  });

  const refreshRide = useCallback(async () => {
    if (!rideId) return;
    const { data, error } = await supabase.from("rides").select("*").eq("id", rideId).single();
    if (error) { setError(error.message); return; }

    const wasAccepted = ride?.status !== "accepted" && data.status === "accepted";
    const wasCompleted = ride?.status !== "completed" && data.status === "completed";
    setRide(data as Ride);

    if (wasAccepted) {
      playAcceptedSound();
      try {
        if (typeof globalThis.Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("🎉 Driver Accepted!", { body: "Your ride has been confirmed.", icon: "/icons/icon-192x192.png" });
        }
      } catch (_) {}
    }
    if (wasCompleted && !hasRated) setShowRating(true);

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
      if (typeof globalThis.Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    } catch (_) {}
  }, []);

  const driverLocation = useDriverTracking(
    (driverProfile as Record<string, unknown>)?.user_id as string ?? null,
    ride?.status ?? null
  );

  // Show nearby online drivers while waiting for offers
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
    const clampedFare = clampTo5(newFare);
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

  // Convert offers to modal format
  const modalViewing = offers.map((o) => {
    const d = driversById[o.driver_id];
    return {
      driverId: o.driver_id,
      name: d?.vehicle_make ? `${d.vehicle_make} ${d.vehicle_model}` : "Driver",
      phone: "+263",
      vehicleType: d?.vehicle_type as "Car" | "Taxi" | "Motorbike" || "Car",
      plateNumber: d?.plate_number || "—",
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
      plateNumber: d?.plate_number || "—",
      languages: ["English"],
      distanceKm: 0,
      etaMinutes: o.eta_minutes || 10,
      offerId: o.id,
      offeredFareR: o.price,
      createdAt: o.created_at || new Date().toISOString(),
      driverName: driverFullName || (d?.vehicle_make ? `${d.vehicle_make} Driver` : "Driver"),
      vehicleMake: d?.vehicle_make || undefined,
      vehicleModel: d?.vehicle_model || undefined,
      gender: d?.gender || null,
      avatarUrl: d?.avatar_url || null,
      ratingAvg: (d as Record<string, unknown>)?.rating_avg as number || null,
      totalTrips: (d as Record<string, unknown>)?.total_trips as number || null
    };
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card-heavy rounded-full px-6 py-3 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-foreground">Loading ride…</span>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-background p-4">
        <button onClick={() => nav(-1)} className="w-11 h-11 flex items-center justify-center rounded-full glass-btn active:scale-95 transition-all mb-4">
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <div className="glass-card-heavy rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">Ride not found.</p>
        </div>
      </div>
    );
  }

  const isAccepted = ["accepted", "in_progress", "arrived"].includes(ride.status);
  const isPending = ride.status === "pending";

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

      {/* Map background */}
      <div className="absolute inset-0">
        {ride.pickup_lat && (
          <MapGoogle
            pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lon }}
            dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lon }}
            driverLocation={driverLocation}
            drivers={isPending ? nearbyDrivers : undefined}
            routeGeometry={ride.route_polyline}
            className="w-full h-full"
            height="100%"
          />
        )}
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, hsl(217 85% 29% / 0.12), transparent)' }} />
      </div>

      {/* Glass header */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button onClick={() => nav("/ride")} className="w-11 h-11 flex items-center justify-center rounded-full glass-btn active:scale-95 transition-all glass-glow-blue">
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <div className="glass-card-heavy rounded-full px-4 py-2">
          <h1 className="font-bold text-sm text-foreground">Your Ride</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAccepted && (
            <button onClick={() => setShowCommunication(!showCommunication)} className="w-11 h-11 flex items-center justify-center rounded-full glass-btn active:scale-95 transition-all glass-glow-blue">
              <MessageCircle className="w-5 h-5 text-primary" />
            </button>
          )}
          <EmergencyButton />
        </div>
      </div>

      {/* ETA Banner removed from map - now shown below accepted driver card */}

      {/* Bottom glass panel */}
      <div className="absolute left-0 right-0 z-50 glass-card-heavy max-h-[50vh] overflow-y-auto" style={{ bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="sticky top-0 pt-3 pb-2 z-10" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, background: 'var(--gradient-primary)' }}>
          <div className="w-10 h-1 rounded-full bg-primary-foreground/40 mx-auto" />
        </div>

        <div className="px-4 pb-4 space-y-3">
          {/* Route info */}
          <div className="glass-card rounded-2xl p-4 glass-glow-blue">
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

            {ride.status === "completed" && (
              <div className="mt-4">
                <TripReceipt
                  ride={{ ...ride, payment_method: 'cash', vehicle_type: 'standard', created_at: new Date().toISOString() }}
                  driverName={(driverProfile as any)?.vehicle_make ? `${(driverProfile as any)?.vehicle_make} Driver` : undefined}
                  onRateDriver={!hasRated && ride.driver_id ? () => setShowRating(true) : undefined}
                  hasRated={hasRated}
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your offer</p>
                {isPending ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 glass-btn" onClick={() => updateFare(ride.fare - 5)} disabled={updatingFare || ride.fare <= 10}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-black text-xl min-w-[60px] text-center text-foreground">${ride.fare.toFixed(2)}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8 glass-btn" onClick={() => updateFare(ride.fare + 5)} disabled={updatingFare}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="font-black text-xl text-foreground">${ride.fare.toFixed(2)}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</p>
                <p className="font-semibold capitalize text-primary">{ride.status}</p>
              </div>
            </div>
          </div>

          {/* Expiry countdown */}
          {isPending && ride.expires_at && (
            <div className={`glass-card rounded-2xl p-4 ${secondsLeft <= 10 ? 'ring-1 ring-destructive/30' : 'glass-glow-blue'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground text-sm">Waiting for drivers…</span>
                </div>
                <span className={`font-black text-lg ${secondsLeft <= 10 ? 'text-destructive' : 'text-primary'}`}>
                  {secondsLeft}s
                </span>
              </div>
              <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${secondsLeft <= 10 ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, secondsLeft / 30 * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Offers section */}
          {!isAccepted && (
            <div className="glass-card rounded-2xl p-4">
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
            </div>
          )}

          {/* Cancellation */}
          {ride.status !== "completed" && ride.status !== "cancelled" && ride.status !== "expired" && (
            <CancellationPolicy rideId={ride.id} rideStatus={ride.status} onCancelled={() => nav("/ride")} />
          )}

          {/* Driver card when accepted */}
          {isAccepted && driverProfile && (
            <div className="glass-card rounded-2xl p-4 glass-glow-blue">
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
                      <span className="flex items-center gap-0.5 text-xs font-semibold glass-card rounded-full px-2 py-0.5 glass-glow-yellow">
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
                  <a href={`tel:${driverPhone}`} className="flex items-center justify-center gap-1 py-3 rounded-2xl font-medium text-xs active:scale-95 transition-all text-center" style={{ background: 'var(--gradient-primary)' }}>
                    <Phone className="h-3.5 w-3.5 text-primary-foreground shrink-0" />
                    <span className="text-primary-foreground">Phone</span>
                  </a>
                  <Button variant="outline" className="glass-card rounded-2xl h-auto py-3 text-xs font-medium" onClick={() => setShowCommunication(!showCommunication)}>
                    <MessageCircle className="h-3.5 w-3.5 mr-1 shrink-0" /> Chat
                  </Button>
                </div>
              )}
              {/* Direct EcoCash Payment Option */}
              {(() => {
                const ecocashNum = (driverProfile as Record<string, unknown>)?.ecocash_number as string | undefined;
                const displayNumber = ecocashNum || '+263 778 553 169';
                const isTrialNumber = !ecocashNum;
                return (
                  <div className="bg-accent/10 rounded-xl p-3 mt-3 border border-accent/20">
                    <p className="text-xs font-semibold text-accent mb-1">💰 Pay Driver via EcoCash</p>
                    <p className="text-sm font-mono font-bold text-foreground">
                      {displayNumber}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Send ${Number(ride.fare).toFixed(2)} to this EcoCash number
                    </p>
                    {isTrialNumber && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">Voyex merchant number</p>
                    )}
                  </div>
                );
              })()}

              {/* ETA Banner - below driver card */}
              {driverLocation && ride.pickup_lat && (
                <div className="rounded-2xl overflow-hidden mt-3 glass-card">
                  <DriverETABanner
                    driverLocation={driverLocation}
                    pickupLat={ride.pickup_lat} pickupLng={ride.pickup_lon}
                    dropoffLat={ride.dropoff_lat} dropoffLng={ride.dropoff_lon}
                    rideStatus={ride.status} />
                </div>
              )}
            </div>
          )}

          {/* Communication */}
          {isAccepted && showCommunication && user && (
            <div className="glass-card rounded-2xl p-4">
              <RideCommunication rideId={ride.id} currentUserId={user.id} otherUserPhone={driverPhone} riderId={ride.user_id} />
            </div>
          )}

          {/* Share Trip - visible during active rides */}
          {isAccepted && ride && (
            <ShareTripButton rideId={ride.id} pickupAddress={ride.pickup_address} dropoffAddress={ride.dropoff_address} />
          )}

          {ride.status === "completed" && !hasRated && !showRating && ride.driver_id && user && (
            <Button className="w-full h-[52px] gap-2 rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground font-bold" onClick={() => setShowRating(true)}>
              <Star className="h-4 w-4" /> Rate Your Driver
            </Button>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>
      </div>



      {/* Modals */}
      <OffersModal
        isOpen={modalOpen} tripId={ride.id} viewing={modalViewing} offers={modalOffers}
        onAcceptOffer={handleAcceptOffer} onDeclineOffer={handleDeclineOffer}
        onCancelRide={handleCancelRide} onClose={() => setModalOpen(false)} />

      {showRating && ride.driver_id && user && (
        <DriverRatingModal
          rideId={ride.id} driverId={ride.driver_id} riderId={user.id}
          driverName={driverProfile ? `${(driverProfile as Record<string, unknown>).vehicle_make || ''} Driver`.trim() : undefined}
          onClose={() => { setShowRating(false); setHasRated(true); }} />
      )}
    </div>
  );
}
