import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useOpenRidesRealtime } from "@/hooks/useRideRealtime";
import { 
  fetchOpenRides, 
  getDriverProfile, 
  submitOffer, 
  clampTo5, 
  isNightLocal,
  defaultNightMultiplier,
  type DriverProfile 
} from "@/lib/offerHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Navigation, Clock, Minus, Plus, Send, Radio, Bell } from "lucide-react";

type Ride = {
  id: string;
  user_id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  fare: number;
  distance_km: number;
  duration_minutes: number;
  created_at: string;
};

export default function DriverDashboard() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [mult, setMult] = useState(defaultNightMultiplier());
  const [offerPrice, setOfferPrice] = useState(50);
  const [eta, setEta] = useState(10);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const lastRideIds = useRef<Set<string>>(new Set());

  // Toggle online status
  const toggleOnline = async (online: boolean) => {
    if (!profile || togglingOnline) return;
    
    setTogglingOnline(true);
    try {
      const { error: updateErr } = await supabase
        .from("drivers")
        .update({ is_online: online })
        .eq("id", profile.id);

      if (updateErr) throw new Error(updateErr.message);
      
      setIsOnline(online);
      setProfile({ ...profile, is_online: online });
      
      if (online) {
        toast.success("You're now online!", { description: "You'll see new ride requests" });
        // Fetch rides immediately when going online
        refresh();
      } else {
        toast.info("You're now offline", { description: "You won't receive new ride requests" });
        setRides([]);
      }
    } catch (e: any) {
      toast.error("Failed to update status", { description: e.message });
    } finally {
      setTogglingOnline(false);
    }
  };

  const refresh = useCallback(async () => {
    try {
      setError(null);
      
      const p = await getDriverProfile();
      setProfile(p);
      setIsOnline(p?.is_online ?? false);

      if (!p) {
        setLoading(false);
        setError("Driver profile not found. Complete driver registration first.");
        return;
      }

      if (p.status !== "approved") {
        setLoading(false);
        return;
      }

      // Only fetch rides if driver is online
      if (p.is_online) {
        const list = await fetchOpenRides();
        setRides(list as Ride[]);

        // Notify on new rides
        const currentIds = new Set(list.map((r) => r.id));
        for (const id of currentIds) {
          if (!lastRideIds.current.has(id)) {
            toast.info("New ride request!", { description: "A rider is looking for a driver" });
            // Also send browser notification if permitted
            if (Notification.permission === "granted") {
              new Notification("New Koloi Ride Request!", {
                body: "A rider is looking for a driver near you",
                icon: "/icons/icon-192x192.png"
              });
            }
            break;
          }
        }
        lastRideIds.current = currentIds;
      } else {
        setRides([]);
      }

      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      nav("/auth");
      return;
    }
    if (!authLoading) {
      refresh();
    }
  }, [authLoading, user, nav, refresh]);

  // Realtime subscription for open rides (only triggers refresh if online)
  useOpenRidesRealtime(refresh);

  const chooseRide = (r: Ride) => {
    setSelectedRide(r);
    const base = clampTo5((r.fare || 50) * mult);
    setOfferPrice(base);
    setEta(Math.max(5, Math.round(r.duration_minutes / 2)));
    setNote(isNightLocal() ? "Night service" : "");
  };

  const inc = () => setOfferPrice((p) => clampTo5(p + 5));
  const dec = () => setOfferPrice((p) => clampTo5(p - 5, 5));

  const sendOffer = async () => {
    if (!selectedRide || submitting) return;
    
    try {
      setSubmitting(true);
      setError(null);
      await submitOffer({ 
        ride_id: selectedRide.id, 
        price: offerPrice, 
        eta_minutes: eta, 
        message: note 
      });
      toast.success("Offer sent!", { description: `R${offerPrice} for ${eta} min ETA` });
      setSelectedRide(null);
    } catch (e: any) {
      setError(e.message);
      toast.error("Failed to send offer", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={() => nav(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Driver profile not found."}</p>
            <Button onClick={() => nav("/drive")} className="mt-4">
              Complete Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profile.status !== "approved") {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={() => nav(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Your driver status is <strong>{profile.status}</strong>. 
              Please wait for admin approval before accepting rides.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => nav(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-black text-lg">Driver Dashboard</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Online Status Toggle */}
        <Card className={isOnline ? "border-primary bg-primary/5" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isOnline ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-lg">{isOnline ? "You're Online" : "You're Offline"}</p>
                  <p className="text-sm text-muted-foreground">
                    {isOnline ? "Receiving ride requests" : "Go online to see ride requests"}
                  </p>
                </div>
              </div>
              <Switch
                checked={isOnline}
                onCheckedChange={toggleOnline}
                disabled={togglingOnline}
              />
            </div>
          </CardContent>
        </Card>

        {/* Night Pricing Info - only show when online */}
        {isOnline && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Night Mode</p>
                  <p className="text-xs text-muted-foreground">
                    {isNightLocal() ? "Active (20:00-05:00)" : "Inactive"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Multiplier:</span>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="2"
                    value={mult}
                    onChange={(e) => setMult(Math.max(1, Math.min(2, Number(e.target.value) || 1)))}
                    className="w-20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Rides */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Available Rides</h2>
            {isOnline && rides.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4" />
                <span>{rides.length} request{rides.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          {!isOnline ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground font-medium">You're currently offline</p>
                <p className="text-sm text-muted-foreground mt-1">Toggle the switch above to go online and see ride requests</p>
              </CardContent>
            </Card>
          ) : rides.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No open ride requests right now. Stay online!
              </CardContent>
            </Card>
          ) : (
            rides.map((r) => (
              <Card 
                key={r.id} 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => chooseRide(r)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <MapPin className="h-4 w-4 text-primary" />
                      <div className="w-0.5 h-6 bg-border" />
                      <Navigation className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{r.pickup_address}</p>
                      <p className="text-sm text-muted-foreground truncate">{r.dropoff_address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg">R{r.fare}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.distance_km?.toFixed(1)} km
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Offer Modal */}
        {selectedRide && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50">
            <div className="w-full max-w-lg mx-auto bg-background rounded-t-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Make an Offer</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRide(null)}>
                  Cancel
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>{selectedRide.pickup_address}</p>
                <p>→ {selectedRide.dropoff_address}</p>
              </div>

              {/* Price Stepper */}
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={dec}>
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <p className="text-3xl font-black">R{offerPrice}</p>
                  <p className="text-xs text-muted-foreground">Increments of R5</p>
                </div>
                <Button variant="outline" size="icon" onClick={inc}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* ETA and Note */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">ETA (min)</label>
                  <Input
                    type="number"
                    value={eta}
                    onChange={(e) => setEta(Math.max(1, Number(e.target.value) || 10))}
                  />
                </div>
                <div className="flex-2">
                  <label className="text-xs text-muted-foreground">Note (optional)</label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g., Night service"
                  />
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={sendOffer}
                disabled={submitting}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Sending..." : `Send Offer • R${offerPrice}`}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
