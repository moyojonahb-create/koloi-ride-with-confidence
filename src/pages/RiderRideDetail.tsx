import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useRideRealtime } from "@/hooks/useRideRealtime";
import {
  fetchPendingOffers,
  fetchDriversByIds,
  acceptOffer,
  declineOffer,
  type Offer,
  type DriverProfile,
} from "@/lib/offerHelpers";
import { RideCommunication } from "@/components/ride/RideCommunication";
import OffersModal from "@/components/OffersModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Navigation, Users, Eye } from "lucide-react";

type Ride = {
  id: string;
  user_id: string;
  driver_id: string | null;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  fare: number;
  distance_km: number;
  duration_minutes: number;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshRide = useCallback(async () => {
    if (!rideId) return;
    
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .eq("id", rideId)
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setRide(data as Ride);

    // If ride is accepted, fetch driver info
    if (data.driver_id && data.status === "accepted") {
      const { data: driverData } = await supabase
        .from("drivers")
        .select("*, profiles:user_id(full_name, phone)")
        .eq("id", data.driver_id)
        .single();

      if (driverData) {
        setDriverProfile(driverData);
        // Get phone from profiles join
        const profile = (driverData as any).profiles;
        if (profile?.phone) {
          setDriverPhone(profile.phone);
        }
      }
    }
  }, [rideId]);

  const refreshOffers = useCallback(async () => {
    if (!rideId) return;
    
    try {
      const list = await fetchPendingOffers(rideId);
      setOffers(list);

      const ids = [...new Set(list.map((o) => o.driver_id))];
      const map = await fetchDriversByIds(ids);
      setDriversById(map);
    } catch (e: any) {
      console.error("Failed to fetch offers:", e);
    }
  }, [rideId]);

  // Realtime subscriptions
  useRideRealtime(rideId ?? null, {
    onRideChange: refreshRide,
    onOfferChange: refreshOffers,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      nav("/auth");
      return;
    }

    if (!authLoading && rideId) {
      Promise.all([refreshRide(), refreshOffers()])
        .finally(() => setLoading(false));
    }
  }, [authLoading, user, rideId, nav, refreshRide, refreshOffers]);

  const handleAcceptOffer = async (offerId: string) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer || !rideId) return;

    try {
      setError(null);
      await acceptOffer(rideId, offer);
      setModalOpen(false);
      toast.success("Driver accepted!", { 
        description: "You can now contact your driver" 
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
      const { error } = await supabase
        .from("rides")
        .update({ status: "cancelled" })
        .eq("id", rideId);

      if (error) throw error;
      
      toast.info("Ride cancelled");
      nav("/ride");
    } catch (e: any) {
      toast.error("Failed to cancel ride", { description: e.message });
    }
  };

  // Convert offers to modal format
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
      ...modalViewing.find((v) => v.driverId === o.driver_id)!,
      offerId: o.id,
      offeredFareR: o.price,
      createdAt: o.created_at || new Date().toISOString(),
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

  const isAccepted = ride.status === "accepted";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => nav("/ride")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-black text-lg">Your Ride</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
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
                <p className="font-black text-xl">R{ride.fare}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{ride.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                className="w-full mt-4" 
                onClick={() => setModalOpen(true)}
                disabled={offers.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Offers
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
                  <p className="font-semibold">Your Driver</p>
                  <p className="text-sm text-muted-foreground">
                    {driverProfile.vehicle_make} {driverProfile.vehicle_model} • {driverProfile.plate_number}
                  </p>
                </div>
              )}
              
              <RideCommunication
                rideId={ride.id}
                currentUserId={user.id}
                otherUserPhone={driverPhone}
                riderId={ride.user_id}
              />
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

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
