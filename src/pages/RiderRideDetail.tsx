import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useRideRealtime } from "@/hooks/useRideRealtime";
import { getSecondsRemaining, isRideExpired } from "@/lib/rideExpiry";
import {
  fetchPendingOffers,
  fetchDriversByIds,
  acceptOffer,
  declineOffer,
  clampTo5,
  type Offer,
  type DriverProfile,
} from "@/lib/offerHelpers";
import { RideCommunication } from "@/components/ride/RideCommunication";
import OffersModal from "@/components/OffersModal";
import OSMMap from "@/components/OSMMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Navigation, Users, Eye, Minus, Plus, MessageCircle, Phone, Clock } from "lucide-react";
import { playAcceptedSound, playNewRequestSound } from "@/lib/notificationSounds";

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
  const { rideId } = useParams<{ rideId: string }>();
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [ride, setRide] = useState<Ride | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [driversById, setDriversById] = useState<Record<string, DriverProfile>>({});
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [driverPhone, setDriverPhone] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingFare, setUpdatingFare] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);
  const [lastOfferCount, setLastOfferCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(30);

  const refreshRide = useCallback(async () => {
    if (!rideId) return;

    const { data, error } = await supabase.from("rides").select("*").eq("id", rideId).single();

    if (error) {
      setError(error.message);
      return;
    }

    const wasAccepted = ride?.status !== "accepted" && data.status === "accepted";
    setRide(data as Ride);

    // Play sound when ride is accepted
    if (wasAccepted) {
      playAcceptedSound();
      if (Notification.permission === "granted") {
        new Notification("🎉 Driver Accepted!", {
          body: "Your ride has been confirmed. You can now contact your driver.",
          icon: "/icons/icon-192x192.png",
        });
      }
    }

    // If ride is accepted, fetch driver info
    if (data.driver_id && (data.status === "accepted" || data.status === "in_progress" || data.status === "arrived")) {
      try {
        // First get the driver record
        const { data: driverData, error: driverErr } = await supabase
          .from("drivers")
          .select("*")
          .eq("id", data.driver_id)
          .maybeSingle();

        if (driverErr) {
          console.warn("Failed to fetch driver:", driverErr.message);
        }

        if (driverData) {
          setDriverProfile(driverData);

          // Now fetch the profile separately using the driver's user_id
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", driverData.user_id)
            .maybeSingle();

          if (profileData?.phone) {
            setDriverPhone(profileData.phone);
          }
        }
      } catch (e: any) {
        console.warn("Error fetching driver details:", e.message);
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
        if (Notification.permission === "granted") {
          new Notification("New Driver Offer!", {
            body: "A driver has made an offer on your ride request.",
            icon: "/icons/icon-192x192.png",
          });
        }
      }
      setLastOfferCount(list.length);
      setOffers(list);

      const ids = [...new Set(list.map((o) => o.driver_id))];
      const map = await fetchDriversByIds(ids);
      setDriversById(map);
    } catch (e: any) {
      console.error("Failed to fetch offers:", e);
    }
  }, [rideId, lastOfferCount]);

  // Realtime subscriptions
  useRideRealtime(rideId ?? null, {
    onRideChange: refreshRide,
    onOfferChange: refreshOffers,
  });

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Poll driver location when ride is accepted
  useEffect(() => {
    if (!ride || !driverProfile || !["accepted", "in_progress", "arrived"].includes(ride.status)) return;

    const driverUserId = driverProfile.user_id;
    if (!driverUserId) return;

    const fetchDriverLocation = async () => {
      const { data } = await supabase
        .from("live_locations")
        .select("latitude, longitude")
        .eq("user_id", driverUserId)
        .eq("user_type", "driver")
        .maybeSingle();

      if (data) {
        setDriverLocation({ lat: data.latitude, lng: data.longitude });
      }
    };

    fetchDriverLocation();
    const interval = setInterval(fetchDriverLocation, 5000);
    return () => clearInterval(interval);
  }, [ride?.status, driverProfile?.user_id]);

  // Countdown timer for ride expiry
  useEffect(() => {
    if (!ride || ride.status !== "pending" || !ride.expires_at) return;

    const updateCountdown = () => {
      const secs = getSecondsRemaining(ride.expires_at ?? null);
      setSecondsLeft(secs);

      // Auto-navigate back if expired
      if (secs <= 0 && ride.status === "pending") {
        toast.info("Ride request expired", {
          description: "Your request timed out. Please try again.",
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
    } catch (e: any) {
      toast.error("Failed to update fare", { description: e.message });
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
        description: "You can now contact your driver",
      });
      await refreshRide();
    } catch (e: any) {
      setError(e.message);
      toast.error("Failed to accept offer", { description: e.message });
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    try {
      await declineOffer(offerId);
      toast.info("Offer declined");
      await refreshOffers();
    } catch (e: any) {
      toast.error("Failed to decline offer", { description: e.message });
    }
  };

  const handleCancelRide = async () => {
    if (!rideId) return;

    try {
      const { error } = await supabase.from("rides").update({ status: "cancelled" }).eq("id", rideId);

      if (error) throw error;

      toast.info("Ride cancelled");
      nav("/ride");
    } catch (e: any) {
      toast.error("Failed to cancel ride", { description: e.message });
    }
  };

  // Convert offers to modal format with full driver details
  const modalViewing = offers.map((o) => {
    const d = driversById[o.driver_id];
    return {
      driverId: o.driver_id,
      name: d?.vehicle_make ? `${d.vehicle_make} ${d.vehicle_model}` : "Driver",
      phone: "+263", // Placeholder - actual phone hidden until accepted
      vehicleType: (d?.vehicle_type as "Car" | "Taxi" | "Motorbike") || "Car",
      plateNumber: d?.plate_number || "—",
      languages: ["English"],
      distanceKm: 0,
      etaMinutes: o.eta_minutes || 10,
    };
  });

  const modalOffers = offers.map((o) => {
    const d = driversById[o.driver_id];
    return {
      driverId: o.driver_id,
      name: d?.vehicle_make ? `${d.vehicle_make} ${d.vehicle_model}` : "Driver",
      phone: "+263", // Placeholder until accepted
      vehicleType: (d?.vehicle_type as "Car" | "Taxi" | "Motorbike") || "Car",
      plateNumber: d?.plate_number || "—",
      languages: ["English"],
      distanceKm: 0,
      etaMinutes: o.eta_minutes || 10,
      // Extended driver info
      offerId: o.id,
      offeredFareR: o.price,
      createdAt: o.created_at || new Date().toISOString(),
      driverName: d?.vehicle_make ? `${d.vehicle_make} Driver` : "Driver",
      vehicleMake: d?.vehicle_make || undefined,
      vehicleModel: d?.vehicle_model || undefined,
      gender: d?.gender || null,
    };
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
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
      </div>
    );
  }

  const isAccepted = ["accepted", "in_progress", "arrived"].includes(ride.status);
  const isPending = ride.status === "pending";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => nav("/ride")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-black text-lg">Your Ride</h1>
          {isAccepted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCommunication(!showCommunication)}
              className="relative"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          )}
          {!isAccepted && <div className="w-10" />}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Map - Show route and driver location */}
        {isAccepted && ride.pickup_lat && (
          <Card className="overflow-hidden">
            <OSMMap
              pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lon }}
              dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lon }}
              routeGeometry={ride.route_polyline}
              driverLocation={driverLocation || undefined}
              height="280px"
              showRecenterButton
            />
          </Card>
        )}

        {/* Ride Details */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <MapPin className="h-4 w-4 text-primary" />
                <div className="w-0.5 h-6 bg-border" />
                <Navigation className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{ride.pickup_address}</p>
                <p className="text-sm text-muted-foreground truncate">{ride.dropoff_address}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground">Your offer</p>
                {isPending ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateFare(ride.fare - 5)}
                      disabled={updatingFare || ride.fare <= 10}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-black text-xl min-w-[60px] text-center">R{ride.fare}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateFare(ride.fare + 5)}
                      disabled={updatingFare}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="font-black text-xl">R{ride.fare}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{ride.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiry Countdown - Only for pending rides */}
        {isPending && ride.expires_at && (
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
                  style={{ width: `${Math.min(100, (secondsLeft / 30) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Your request will expire automatically when the timer runs out
              </p>
            </CardContent>
          </Card>
        )}

        {/* Offers Section - Only show if not accepted */}
        {!isAccepted && (
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
                disabled={offers.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Offers ({offers.length})
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Communication Section - Only show if accepted */}
        {isAccepted && user && (
          <Card>
            <CardContent className="pt-4">
              {driverProfile && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Your Driver</p>
                      <p className="text-sm text-muted-foreground">
                        {driverProfile.vehicle_make} {driverProfile.vehicle_model} • {driverProfile.plate_number}
                      </p>
                    </div>
                    {driverProfile.gender && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${driverProfile.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                        {driverProfile.gender === 'female' ? '♀' : '♂'} {driverProfile.gender.charAt(0).toUpperCase() + driverProfile.gender.slice(1)}
                      </span>
                    )}
                  </div>
                  {driverPhone && (
                    <div className="flex gap-2 mt-3">
                      <a
                        href={`tel:${driverPhone}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold"
                      >
                        <Phone className="h-4 w-4" />
                        Call Driver
                      </a>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowCommunication(!showCommunication)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  )}
                  {driverPhone && <p className="text-xs text-muted-foreground mt-2 text-center">📞 {driverPhone}</p>}
                </div>
              )}

              {showCommunication && (
                <RideCommunication
                  rideId={ride.id}
                  currentUserId={user.id}
                  otherUserPhone={driverPhone}
                  riderId={ride.user_id}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Offers Modal */}
        <OffersModal
          isOpen={modalOpen}
          tripId={ride.id}
          viewing={modalViewing}
          offers={modalOffers}
          onAcceptOffer={handleAcceptOffer}
          onDeclineOffer={handleDeclineOffer}
          onCancelRide={handleCancelRide}
          onClose={() => setModalOpen(false)}
        />

        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>
    </div>
  );
}
