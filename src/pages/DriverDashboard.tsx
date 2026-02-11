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
  type DriverProfile,
} from "@/lib/offerHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Minus,
  Plus,
  Send,
  Radio,
  Bell,
  Volume2,
  History,
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { triggerFullAlert } from "@/lib/alerts";
import { useVoiceNavigation } from "@/hooks/useVoiceNavigation";
import { filterActiveRides, getSecondsRemaining, expireOldRides } from "@/lib/rideExpiry";
import { useWallet } from "@/hooks/useWallet";
import { completeTrip } from "@/lib/completeTrip";
import WalletBalance from "@/components/wallet/WalletBalance";
import DepositModal from "@/components/wallet/DepositModal";
import TransactionsSheet from "@/components/wallet/TransactionsSheet";

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
  expires_at?: string | null;
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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [activeTrip, setActiveTrip] = useState<{ id: string; pickup_address: string; dropoff_address: string; fare: number } | null>(null);
  const [completing, setCompleting] = useState(false);

  const lastRideIds = useRef<Set<string>>(new Set());
  const { speak, isSupported: voiceSupported } = useVoiceNavigation({ enabled: voiceEnabled });
  const { wallet, balance, transactions, deposit, refresh: refreshWallet } = useWallet();

  // Helper: days left in trial
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const trialActive = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at).getTime() > Date.now()
    : false;

  // Toggle online status with can_driver_operate check
  const toggleOnline = async (online: boolean) => {
    if (!profile || togglingOnline) return;

    setTogglingOnline(true);
    try {
      if (online) {
        // Check if driver can operate (trial or wallet balance)
        const { data: canOperate, error: rpcErr } = await supabase.rpc("can_driver_operate", { p_driver_id: user!.id });
        if (rpcErr) throw new Error(rpcErr.message);
        if (!canOperate) {
          toast.error("Cannot go online", {
            description: "Your trial has ended or your wallet balance is too low. Please deposit to continue.",
            duration: 8000,
          });
          setTogglingOnline(false);
          return;
        }
      }

      const { error: updateErr } = await supabase.from("drivers").update({ is_online: online }).eq("id", profile.id);

      if (updateErr) throw new Error(updateErr.message);

      setIsOnline(online);
      setProfile({ ...profile, is_online: online });

      if (online) {
        toast.success("You're now online!", { description: "You'll see new ride requests" });
        if (voiceEnabled && voiceSupported) {
          speak("You are now online. Waiting for ride requests.");
        }
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

      // Fetch active trip (accepted/in_progress) assigned to this driver
      const { data: activeTripData } = await supabase
        .from("rides")
        .select("id, pickup_address, dropoff_address, fare, status")
        .eq("driver_id", p.id)
        .in("status", ["accepted", "in_progress", "arrived"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveTrip(activeTripData ? { id: activeTripData.id, pickup_address: activeTripData.pickup_address, dropoff_address: activeTripData.dropoff_address, fare: Number(activeTripData.fare) } : null);

      // Only fetch rides if driver is online
      if (p.is_online) {
        // Expire old rides server-side first
        await expireOldRides();
        const list = await fetchOpenRides();
        const activeList = filterActiveRides(list);
        setRides(activeList as Ride[]);

        // Notify on new rides with LOUD sound and voice
        const currentIds = new Set(list.map((r) => r.id));
        let hasNewRide = false;
        for (const id of currentIds) {
          if (!lastRideIds.current.has(id)) {
            hasNewRide = true;
            break;
          }
        }

        if (hasNewRide) {
          triggerFullAlert(
            "🚗 NEW KOLOI RIDE REQUEST!",
            "⚡ A rider is looking for a driver near you - respond NOW!",
            "/driver"
          );

          if (voiceEnabled && voiceSupported) {
            speak("Attention! New ride request received! Open Koloi to respond.");
          }

          toast.info("🚗 NEW RIDE REQUEST!", {
            description: "A rider is looking for a driver - respond quickly!",
            duration: 10000,
          });
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
  }, [voiceEnabled, voiceSupported, speak]);

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

  // Client-side timer to filter out expired rides every second
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      setRides((prev) => {
        const filtered = filterActiveRides(prev);
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOnline]);

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

    // Check if ride has expired before sending
    if (selectedRide.expires_at && new Date(selectedRide.expires_at).getTime() < Date.now()) {
      toast.error("This request has expired");
      setSelectedRide(null);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await submitOffer({
        ride_id: selectedRide.id,
        price: offerPrice,
        eta_minutes: eta,
        message: note,
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

  const handleCompleteTrip = async () => {
    if (!activeTrip || completing) return;
    setCompleting(true);
    try {
      const result = await completeTrip(activeTrip.id);
      if (!(result as any)?.ok) {
        throw new Error((result as any)?.reason || "Failed to complete trip");
      }
      toast.success("Trip completed!", {
        description: `R4 fee charged (≈$${(result as any)?.fee_usd ?? "?"})`,
      });
      setActiveTrip(null);
      refreshWallet();
      refresh();
    } catch (e: any) {
      toast.error("Failed to complete trip", { description: e.message });
    } finally {
      setCompleting(false);
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
              Your driver status is <strong>{profile.status}</strong>. Please wait for admin approval before accepting
              rides.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Wallet */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => nav(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-black text-lg">Driver Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTransactionsOpen(true)}
              className="text-muted-foreground"
            >
              <History className="h-5 w-5" />
            </Button>
            <WalletBalance
              balance={balance}
              onClick={() => nav("/drivers/wallet")}
              size="sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Trial Banner */}
        {profile && trialActive && (
          <Card className="border-amber-500 bg-amber-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Free Trial Active</p>
                  <p className="text-xs text-muted-foreground">
                    {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining — no fees until trial ends
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trial Ended Warning */}
        {profile && !trialActive && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Trial Ended</p>
                  <p className="text-xs text-muted-foreground">
                    Maintain wallet balance to stay online (R4 fee per trip)
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => nav("/drivers/wallet")}>
                  <Wallet className="h-4 w-4 mr-1" /> Deposit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
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
              <Switch checked={isOnline} onCheckedChange={toggleOnline} disabled={togglingOnline} />
            </div>
          </CardContent>
        </Card>

        {/* Active Trip */}
        {activeTrip && (
          <Card className="border-emerald-500 bg-emerald-500/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex flex-col items-center">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div className="w-0.5 h-6 bg-border" />
                  <Navigation className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{activeTrip.pickup_address}</p>
                  <p className="text-sm text-muted-foreground truncate">{activeTrip.dropoff_address}</p>
                </div>
                <p className="font-black text-lg">R{activeTrip.fare}</p>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="lg"
                onClick={handleCompleteTrip}
                disabled={completing}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {completing ? "Completing..." : "Complete Trip (R4 fee)"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isOnline && (
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Voice Navigation Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold">Voice Announcements</p>
                    <p className="text-xs text-muted-foreground">
                      {voiceSupported ? "Announce new rides" : "Not supported"}
                    </p>
                  </div>
                </div>
                <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} disabled={!voiceSupported} />
              </div>

              {/* Night Mode */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
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
                <span>
                  {rides.length} request{rides.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {!isOnline ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Radio className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground font-medium">You're currently offline</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Toggle the switch above to go online and see ride requests
                </p>
              </CardContent>
            </Card>
          ) : rides.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No open ride requests right now. Stay online!
              </CardContent>
            </Card>
          ) : (
            rides.map((r) => {
              const secsLeft = getSecondsRemaining(r.expires_at ?? null);
              return (
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
                        <p className="text-xs text-muted-foreground">{r.distance_km?.toFixed(1)} km</p>
                      </div>
                    </div>
                    {r.expires_at && secsLeft > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Expires in</span>
                          <span className={`font-bold ${secsLeft <= 10 ? 'text-destructive' : 'text-primary'}`}>{secsLeft}s</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ease-linear ${secsLeft <= 10 ? 'bg-destructive' : 'bg-primary'}`}
                            style={{ width: `${Math.min(100, (secsLeft / 30) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
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
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Night service" />
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={sendOffer} disabled={submitting}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Sending..." : `Send Offer • R${offerPrice}`}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        onDeposit={deposit}
        currentBalance={balance}
      />

      {/* Transactions Sheet */}
      <TransactionsSheet
        isOpen={transactionsOpen}
        onClose={() => setTransactionsOpen(false)}
        transactions={transactions.map(tx => ({
          id: tx.id,
          amount: Number(tx.amount),
          transaction_type: tx.transaction_type as 'deposit' | 'withdrawal' | 'trip_fee' | 'refund',
          description: tx.description,
          created_at: tx.created_at,
        }))}
        title="Wallet History"
      />
    </div>
  );
}
