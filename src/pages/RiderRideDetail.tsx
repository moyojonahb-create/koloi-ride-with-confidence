import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useRideRealtime } from "@/hooks/useRideRealtime";
import { useDriverTracking } from "@/hooks/useDriverTracking";
import { useAgoraCall } from "@/hooks/useAgoraCall";
import { getSecondsRemaining, isRideExpired } from "@/lib/rideExpiry";
import {
  fetchPendingOffers,
  fetchDriversByIds,
  acceptOffer,
  declineOffer,
  clampTo5,
  type Offer,
  type DriverProfile } from
"@/lib/offerHelpers";
import { RideCommunication } from "@/components/ride/RideCommunication";
import OffersModal from "@/components/OffersModal";
import TripGoogleMap from "@/components/TripGoogleMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Navigation, Users, Eye, Minus, Plus, MessageCircle, Phone, Clock, Star } from "lucide-react";
import DriverETABanner from "@/components/ride/DriverETABanner";
import CancellationPolicy from "@/components/ride/CancellationPolicy";
import EmergencyButton from "@/components/ride/EmergencyButton";
import DriverRatingModal from "@/components/ride/DriverRatingModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { playAcceptedSound, playNewRequestSound } from "@/lib/notificationSounds";
import IncomingCallModal from "@/components/ride/IncomingCallModal";
import ActiveCallOverlay from "@/components/ride/ActiveCallOverlay";
import VoiceCallButton from "@/components/ride/VoiceCallButton";

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
    callStatus,
    isMuted,
    isSpeaker,
    callDuration,
    incomingCall,
    startCall,
    answerCall,
    declineCall: declineIncomingCall,
    endCall,
    toggleMute,
    toggleSpeaker
  } = useAgoraCall({
    rideId: rideId ?? null,
    currentUserId: user?.id ?? "",
    otherUserId: (driverProfile as Record<string, unknown>)?.user_id as string ?? null
  });

  const refreshRide = useCallback(async () => {
    if (!rideId) return;

    const { data, error } = await supabase.from("rides").select("*").eq("id", rideId).single();

    if (error) {
      setError(error.message);
      return;
    }

    const wasAccepted = ride?.status !== "accepted" && data.status === "accepted";
    const wasCompleted = ride?.status !== "completed" && data.status === "completed";
    setRide(data as Ride);

    // Play sound when ride is accepted
    if (wasAccepted) {
      playAcceptedSound();
      try {
        if (typeof globalThis.Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("🎉 Driver Accepted!", {
            body: "Your ride has been confirmed. You can now contact your driver.",
            icon: "/icons/icon-192x192.png"
          });
        }
      } catch (_) {/* Notification API not available */}
    }

    // Show rating modal when ride completes
    if (wasCompleted && !hasRated) {
      setShowRating(true);
    }

    if (data.driver_id && (data.status === "accepted" || data.status === "in_progress" || data.status === "arrived")) {
      try {
        // First get the driver record
        const { data: driverData, error: driverErr } = await supabase.
        from("drivers").
        select("*").
        eq("id", data.driver_id).
        maybeSingle();

        if (driverErr) {
          console.warn("Failed to fetch driver:", driverErr.message);
        }

        if (driverData) {
          setDriverProfile(driverData);

          // Now fetch the profile separately using the driver's user_id
          const { data: profileData } = await supabase.
          from("profiles").
          select("full_name, phone").
          eq("user_id", driverData.user_id).
          maybeSingle();

          if (profileData?.phone) {
            setDriverPhone(profileData.phone);
          }
        }
      } catch (e: unknown) {
        console.warn("Error fetching driver details:", (e as Error).message);
      }
    }
  }, [rideId, ride?.status]);

  const refreshOffers = useCallback(async () => {
    if (!rideId) return;

    try {
      const list = await fetchPendingOffers(rideId);

      // Play sound when new offers come in
      if (list.length > lastOfferCount && lastOfferCount > 0) {
        playNewRequestSound();
        try {
          if (typeof globalThis.Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("New Driver Offer!", {
              body: "A driver has made an offer on your ride request.",
              icon: "/icons/icon-192x192.png"
            });
          }
        } catch (_) {/* Notification API not available */}
      }
      setLastOfferCount(list.length);
      setOffers(list);

      const ids = [...new Set(list.map((o) => o.driver_id))];
      const map = await fetchDriversByIds(ids);
      setDriversById(map);
    } catch (e: unknown) {
      console.error("Failed to fetch offers:", e);
    }
  }, [rideId, lastOfferCount]);

  // Realtime subscriptions
  useRideRealtime(rideId ?? null, {
    onRideChange: refreshRide,
    onOfferChange: refreshOffers
  });

  // Request notification permission
  useEffect(() => {
    try {
      if (typeof globalThis.Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch (_) {/* Notification API not available */}
  }, []);

  // Real-time driver tracking via Supabase Realtime
  const driverLocation = useDriverTracking(
    (driverProfile as Record<string, unknown>)?.user_id as string ?? null,
    ride?.status ?? null
  );

  // Countdown timer for ride expiry
  useEffect(() => {
    if (!ride || ride.status !== "pending" || !ride.expires_at) return;

    const updateCountdown = () => {
      const secs = getSecondsRemaining(ride.expires_at ?? null);
      setSecondsLeft(secs);

      // Auto-navigate back if expired
      if (secs <= 0 && ride.status === "pending") {
        toast.info("Ride request expired", {
          description: "Your request timed out. Please try again."
        });
        nav("/ride");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [ride, nav]);

  useEffect(() => {
    if (!authLoading && !user) {
      nav("/auth");
      return;
    }

    if (!authLoading && rideId) {
      Promise.all([refreshRide(), refreshOffers()]).finally(() => setLoading(false));
    }
  }, [authLoading, user, rideId, nav, refreshRide, refreshOffers]);

  // Update fare - rider can adjust price
  const updateFare = async (newFare: number) => {
    if (!rideId || !ride || ride.status !== "pending") return;

    const clampedFare = clampTo5(newFare);
    if (clampedFare === ride.fare) return;

    setUpdatingFare(true);
    try {
      const { error } = await supabase.from("rides").update({ fare: clampedFare }).eq("id", rideId);

      if (error) throw error;

      setRide({ ...ride, fare: clampedFare });
      toast.success(`Fare updated to R${clampedFare}`);
    } catch (e: unknown) {
      toast.error("Failed to update fare", { description: (e as Error).message });
    } finally {
      setUpdatingFare(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer || !rideId) return;

    try {
      setError(null);
      await acceptOffer(rideId, offer);
      setModalOpen(false);
      playAcceptedSound();
      toast.success("Driver accepted!", {
        description: "You can now contact your driver"
      });
      await refreshRide();
    } catch (e: unknown) {
      setError((e as Error).message);
      toast.error("Failed to accept offer", { description: (e as Error).message });
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    try {
      await declineOffer(offerId);
      toast.info("Offer declined");
      await refreshOffers();
    } catch (e: unknown) {
      toast.error("Failed to decline offer", { description: (e as Error).message });
    }
  };

  const handleCancelRide = async () => {
    if (!rideId) return;

    try {
      const { error } = await supabase.from("rides").update({ status: "cancelled" }).eq("id", rideId);

      if (error) throw error;

      toast.info("Ride cancelled");
      nav("/ride");
    } catch (e: unknown) {
      toast.error("Failed to cancel ride", { description: (e as Error).message });
    }
  };

  // Convert offers to modal format with full driver details
  const modalViewing = offers.map((o) => {
    const d = driversById[o.driver_id];
    return {
      driverId: o.driver_id,
      name: d?.vehicle_make ? `${d.vehicle_make} ${d.vehicle_model}` : "Driver",
      phone: "+263", // Placeholder - actual phone hidden until accepted
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
      phone: "+263", // Placeholder until accepted
      vehicleType: d?.vehicle_type as "Car" | "Taxi" | "Motorbike" || "Car",
      plateNumber: d?.plate_number || "—",
      languages: ["English"],
      distanceKm: 0,
      etaMinutes: o.eta_minutes || 10,
      // Extended driver info
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
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>);

  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={() => nav(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Ride not found.</p>
          </CardContent>
        </Card>
      </div>);

  }

  const isAccepted = ["accepted", "in_progress", "arrived"].includes(ride.status);
  const isPending = ride.status === "pending";

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Active Call Overlay */}
      {callStatus !== "idle" &&
      <ActiveCallOverlay
        status={callStatus}
        duration={callDuration}
        isMuted={isMuted}
        isSpeaker={isSpeaker}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
        onEndCall={endCall}
        otherUserName="Driver" />

      }

      {/* Incoming Call Modal */}
      {incomingCall &&
      <IncomingCallModal
        callerId={incomingCall.callerId}
        onAnswer={answerCall}
        onDecline={declineIncomingCall} />

      }
      {/* Header */}
      <div className="shrink-0 bg-background/95 backdrop-blur border-b border-border px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => nav("/ride")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-black text-lg">Your Ride</h1>
          <div className="flex items-center gap-1">
            {isAccepted &&
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCommunication(!showCommunication)}
              className="relative">
              
                <MessageCircle className="h-5 w-5" />
              </Button>
            }
            <EmergencyButton />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto p-4 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Map - Show route and driver location */}
        {ride.pickup_lat &&
          <Card className="overflow-hidden">
            <TripGoogleMap
              pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lon }}
              dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lon }}
              driverLocation={driverLocation}
              tripStatus={ride.status}
              height="280px" />
            
            {/* Live ETA Banner */}
            {driverLocation &&
            <DriverETABanner
              driverLocation={driverLocation}
              pickupLat={ride.pickup_lat}
              pickupLng={ride.pickup_lon}
              dropoffLat={ride.dropoff_lat}
              dropoffLng={ride.dropoff_lon}
              rideStatus={ride.status} />

            }
          </Card>
          }

        {/* Ride Details */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <MapPin className="h-4 w-4 text-primary bg-destructive-foreground" />
                <div className="w-0.5 h-6 bg-border" />
                <Navigation className="h-4 w-4 text-destructive bg-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{ride.pickup_address}</p>
                <p className="text-sm text-muted-foreground truncate">{ride.dropoff_address}</p>
              </div>
            </div>

            {ride.status === "completed" &&
              <div className="mt-3 px-3 py-2 bg-primary/10 rounded-xl text-sm text-primary font-semibold">
                Trip completed
              </div>
              }

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground">Your offer</p>
                {isPending ?
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateFare(ride.fare - 5)}
                      disabled={updatingFare || ride.fare <= 10}>
                      
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-black text-xl min-w-[60px] text-center">R{ride.fare}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateFare(ride.fare + 5)}
                      disabled={updatingFare}>
                      
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div> :

                  <p className="font-black text-xl">R{ride.fare}</p>
                  }
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize text-sidebar-primary">{ride.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiry Countdown - Only for pending rides */}
        {isPending && ride.expires_at &&
          <Card className={secondsLeft <= 10 ? "border-destructive" : "border-primary"}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">Waiting for drivers…</span>
                </div>
                <span className={`font-black text-lg ${secondsLeft <= 10 ? 'text-destructive' : 'text-primary'}`}>
                  {secondsLeft}s
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ease-linear ${secondsLeft <= 10 ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, secondsLeft / 30 * 100)}%` }} />
                
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Your request will expire automatically when the timer runs out
              </p>
            </CardContent>
          </Card>
          }

        {/* Offers Section - Only show if not accepted */}
        {!isAccepted &&
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">Drivers responding</span>
                </div>
                <span className="font-black text-lg">{offers.length}</span>
              </div>

              <Button
                className="w-full mt-4 bg-primary hover:bg-primary/90"
                onClick={() => setModalOpen(true)}
                disabled={offers.length === 0}>
                
                <Eye className="h-4 w-4 mr-2" />
                View Offers ({offers.length})
              </Button>
            </CardContent>
          </Card>
          }

        {/* Cancellation with fee policy */}
        {ride.status !== "completed" && ride.status !== "cancelled" && ride.status !== "expired" &&
          <CancellationPolicy
            rideId={ride.id}
            rideStatus={ride.status}
            onCancelled={() => nav("/ride")} />

          }

        {/* Communication Section - Only show if accepted */}
        {isAccepted && user &&
          <Card>
            <CardContent className="pt-4">
              {driverProfile &&
              <div className="mb-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-12 w-12 shrink-0 border-2 border-primary/20">
                        {(driverProfile as Record<string, unknown>).avatar_url ?
                      <AvatarImage src={(driverProfile as Record<string, unknown>).avatar_url as string} alt="Driver" /> :
                      null}
                        <AvatarFallback className={`text-sm font-bold ${(driverProfile as Record<string, unknown>).gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                          {(driverProfile as Record<string, unknown>).gender === 'female' ? '♀' : '♂'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">Your Driver</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {String((driverProfile as Record<string, unknown>).vehicle_make || '')} {String((driverProfile as Record<string, unknown>).vehicle_model || '')} • {String((driverProfile as Record<string, unknown>).plate_number || '')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {((driverProfile as Record<string, unknown>).rating_avg as number) > 0 &&
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {Number((driverProfile as Record<string, unknown>).rating_avg).toFixed(1)}
                            </span>
                        }
                          <span className="text-xs text-muted-foreground">
                            {String((driverProfile as Record<string, unknown>).total_trips || 0)} trips
                          </span>
                        </div>
                      </div>
                    </div>
                    {(driverProfile as Record<string, unknown>).gender &&
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${(driverProfile as Record<string, unknown>).gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {(driverProfile as Record<string, unknown>).gender === 'female' ? '♀ Female' : '♂ Male'}
                      </span>
                  }
                  </div>
                  {driverPhone &&
                <div className="flex gap-2 mt-3">
                      <VoiceCallButton
                    onCall={startCall}
                    disabled={callStatus !== "idle"}
                    label="Voice Call"
                    className="flex-1" />
                  
                      <a
                    href={`tel:${driverPhone}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm">
                    
                        <Phone className="h-4 w-4" />
                        Phone
                      </a>
                      <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCommunication(!showCommunication)}>
                    
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Chat
                      </Button>
                    </div>
                }
                  {driverPhone && <p className="text-xs text-muted-foreground mt-2 text-center">📞 {driverPhone}</p>}
                </div>
              }

              {showCommunication &&
              <RideCommunication
                rideId={ride.id}
                currentUserId={user.id}
                otherUserPhone={driverPhone}
                riderId={ride.user_id} />

              }
            </CardContent>
          </Card>
          }

        {/* Offers Modal */}
        <OffersModal
            isOpen={modalOpen}
            tripId={ride.id}
            viewing={modalViewing}
            offers={modalOffers}
            onAcceptOffer={handleAcceptOffer}
            onDeclineOffer={handleDeclineOffer}
            onCancelRide={handleCancelRide}
            onClose={() => setModalOpen(false)} />
          

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        {/* Rating Modal - shown after ride completion */}
        {showRating && ride.driver_id && user &&
          <DriverRatingModal
            rideId={ride.id}
            driverId={ride.driver_id}
            riderId={user.id}
            driverName={driverProfile ? `${(driverProfile as Record<string, unknown>).vehicle_make || ''} Driver`.trim() : undefined}
            onClose={() => {
              setShowRating(false);
              setHasRated(true);
            }} />

          }

        {/* Show rate button for completed rides that haven't been rated */}
        {ride.status === "completed" && !hasRated && !showRating && ride.driver_id && user &&
          <div className="pt-2 pb-4">
            <Button
              className="w-full gap-2"
              onClick={() => setShowRating(true)}>
              
              <Star className="h-4 w-4" />
              Rate Your Driver
            </Button>
          </div>
          }
        </div>
      </div>
    </div>);

}