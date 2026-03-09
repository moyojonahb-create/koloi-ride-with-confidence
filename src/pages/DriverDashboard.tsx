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
  MessageCircle,
  Star,
  TrendingUp,
  Zap,
  BarChart3,
  CreditCard,
  Phone,
  PhoneCall,
} from "lucide-react";
import { playAlert, vibrateAlert, showBrowserNotification } from "@/lib/alerts";
import { playAcceptedSound, playNewRequestSound } from "@/lib/notificationSounds";
import { updateDriverLocation } from "@/lib/driverLocation";
import { useVoiceNavigation } from "@/hooks/useVoiceNavigation";
import { filterActiveRides, getSecondsRemaining, expireOldRides } from "@/lib/rideExpiry";
import { preloadAllTownPricing, type TownPricingConfig } from "@/hooks/useTownPricing";

import { completeTrip } from "@/lib/completeTrip";
import WalletBalance from "@/components/wallet/WalletBalance";
import DepositModal from "@/components/wallet/DepositModal";
import TransactionsSheet from "@/components/wallet/TransactionsSheet";
import { RideCommunication } from "@/components/ride/RideCommunication";
import DriverAvatarUpload from "@/components/driver/DriverAvatarUpload";
import DriverFeedback from "@/components/driver/DriverFeedback";
import DriverSettingsPanel from "@/components/settings/DriverSettingsPanel";
import DriverNavigationView from "@/components/driver/DriverNavigationView";
import type { Coordinates } from "@/lib/osrm";
import { useAgoraCall } from "@/hooks/useAgoraCall";
import IncomingCallModal from "@/components/ride/IncomingCallModal";
import ActiveCallOverlay from "@/components/ride/ActiveCallOverlay";
import VoiceCallButton from "@/components/ride/VoiceCallButton";
import DriverEarningsDashboard from "@/components/driver/DriverEarningsDashboard";
import MapGoogle from "@/components/MapGoogle";

// Smart USD format: $4 for whole, $4.50 for halves
function fmtUSD(n: number): string {
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

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
  town_id?: string | null;
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
  const [activeTrip, setActiveTrip] = useState<{ id: string; pickup_address: string; dropoff_address: string; fare: number; user_id: string; status: string; pickup_lat: number; pickup_lon: number; dropoff_lat: number; dropoff_lon: number; payment_method: string } | null>(null);
  const [earningsOpen, setEarningsOpen] = useState(false);
  const [driverCoords, setDriverCoords] = useState<Coordinates | null>(null);
  const [riderPhone, setRiderPhone] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [isTopDriver, setIsTopDriver] = useState(false);
  const [townPricingMap, setTownPricingMap] = useState<Record<string, TownPricingConfig>>({});

  const lastRideIds = useRef<Set<string>>(new Set());
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { speak, isSupported: voiceSupported } = useVoiceNavigation({ enabled: voiceEnabled });
  const [driverBalance, setDriverBalance] = useState(0);
  const fetchDriverBalance = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("driver_wallets")
      .select("balance_usd")
      .eq("driver_id", user.id)
      .maybeSingle();
    setDriverBalance(data?.balance_usd ?? 0);
  }, [user]);
  useEffect(() => { fetchDriverBalance(); }, [fetchDriverBalance]);
  useEffect(() => { preloadAllTownPricing().then(setTownPricingMap); }, []);

  // Agora voice calling for active trip
  
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
    toggleSpeaker,
  } = useAgoraCall({
    rideId: activeTrip?.id ?? null,
    currentUserId: user?.id ?? "",
    otherUserId: activeTrip?.user_id ?? null,
  });


  // Helper: days left in trial
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const trialActive = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at).getTime() > Date.now()
    : false;

  // Location tracking for admin monitoring
  const startLocationTracking = () => {
    stopLocationTracking();
    if (!navigator.geolocation) return;
    const handlePos = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      updateDriverLocation(latitude, longitude);
      setDriverCoords({ lat: latitude, lng: longitude });
    };
    // Send initial location
    navigator.geolocation.getCurrentPosition(handlePos, () => {});
    // Update every 10 seconds
    locationIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(handlePos, () => {});
    }, 10000);
  };

  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  // Clean up location tracking on unmount
  useEffect(() => {
    return () => stopLocationTracking();
  }, []);

  // Auto-start tracking if already online on mount
  useEffect(() => {
    if (isOnline && profile?.status === "approved") {
      startLocationTracking();
    }
  }, [isOnline, profile?.status]);

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
        // Start live location tracking for admin monitoring
        startLocationTracking();
        refresh();
      } else {
        toast.info("You're now offline", { description: "You won't receive new ride requests" });
        stopLocationTracking();
        setRides([]);
      }
    } catch (e: unknown) {
      toast.error("Failed to update status", { description: (e as Error).message });
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
        .select("id, pickup_address, dropoff_address, fare, status, user_id, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, payment_method")
        .eq("driver_id", p.id)
        .in("status", ["accepted", "enroute_pickup", "in_progress", "arrived"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (activeTripData) {
        const prevStatus = activeTrip?.status;
        const newStatus = activeTripData.status;

        setActiveTrip({
          id: activeTripData.id,
          pickup_address: activeTripData.pickup_address,
          dropoff_address: activeTripData.dropoff_address,
          fare: Number(activeTripData.fare),
          user_id: activeTripData.user_id,
          status: newStatus,
          pickup_lat: activeTripData.pickup_lat,
          pickup_lon: activeTripData.pickup_lon,
          dropoff_lat: activeTripData.dropoff_lat,
          dropoff_lon: activeTripData.dropoff_lon,
          payment_method: activeTripData.payment_method || 'cash',
        });

        // Notify driver when rider accepts their offer
        if (newStatus === 'accepted' && prevStatus !== 'accepted') {
          playAcceptedSound();
          vibrateAlert();
          showBrowserNotification(
            "✅ Ride Accepted!",
            `Rider accepted your offer — $${Number(activeTripData.fare).toFixed(2)}. Head to pickup!`,
            "/driver"
          );
          toast.success("✅ Ride Accepted!", {
            description: `Rider accepted your offer — $${Number(activeTripData.fare).toFixed(2)}. Head to pickup now!`,
            duration: 10000,
          });
        }

        // Voice nav announcement on status transitions
        if (newStatus === 'enroute_pickup' || (newStatus === 'accepted' && prevStatus !== 'accepted')) {
          toast.info("Voice navigation active — follow in-app directions");
        } else if (newStatus === 'in_progress' && prevStatus !== 'in_progress') {
          toast.info("Navigating to drop-off — follow in-app directions");
        }
        // Fetch rider phone
        const { data: riderProfile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("user_id", activeTripData.user_id)
          .maybeSingle();
        setRiderPhone(riderProfile?.phone ?? null);
      } else {
        setActiveTrip(null);
        setRiderPhone(null);
      }

      // Check if top driver for priority access
      const { data: topStatus } = await supabase.rpc("is_top_driver", { _user_id: user!.id });
      setIsTopDriver(!!topStatus);

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
          // Simple beep for incoming rides
          playNewRequestSound();
          vibrateAlert();
          showBrowserNotification(
            "🚗 New Ride Request",
            "A rider is looking for a driver near you",
            "/driver"
          );

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
    } catch (e: unknown) {
      setError((e as Error).message);
      setLoading(false);
    }
  }, [voiceEnabled, voiceSupported, speak]);

  // Request notification permission on mount
  useEffect(() => {
    try {
      if (typeof globalThis.Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch (_) { /* Notification API not available */ }
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
    const base = Math.max(0.50, Math.round(((r.fare || 5) * mult) * 2) / 2);
    setOfferPrice(base);
    setEta(Math.max(5, Math.round(r.duration_minutes / 2)));
    setNote(isNightLocal() ? "Night service" : "");
  };

  const fareStep = 0.50;
  const fareMin = 0.50;

  const inc = () => setOfferPrice((p) => Math.round((p + 0.50) * 2) / 2);
  const dec = () => setOfferPrice((p) => Math.max(0.50, Math.round((p - 0.50) * 2) / 2));

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
      toast.success("Offer sent!", { description: `$${offerPrice.toFixed(2)} for ${eta} min ETA` });
      setSelectedRide(null);
    } catch (e: unknown) {
      setError((e as Error).message);
      toast.error("Failed to send offer", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip || completing) return;
    setCompleting(true);
    try {
      const result = await completeTrip(activeTrip.id);
      if (!(result as Record<string, unknown>)?.ok) {
        throw new Error(((result as Record<string, unknown>)?.reason as string) || "Failed to complete trip");
      }
      const r = result as Record<string, unknown>;
      toast.success("Trip completed!", {
        description: `15% commission: $${r.commission_usd ?? "?"} deducted. You earned $${r.driver_earnings_usd ?? "?"}`,

      });
      setActiveTrip(null);
      fetchDriverBalance();
      refresh();
    } catch (e: unknown) {
      toast.error("Failed to complete trip", { description: (e as Error).message });
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
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Active Call Overlay */}
      {callStatus !== "idle" && (
        <ActiveCallOverlay
          status={callStatus}
          duration={callDuration}
          isMuted={isMuted}
          isSpeaker={isSpeaker}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onEndCall={endCall}
          otherUserName="Rider"
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          callerId={incomingCall.callerId}
          onAnswer={answerCall}
          onDecline={declineIncomingCall}
        />
      )}

      {/* Header with Wallet */}
      <div className="shrink-0 bg-background/95 backdrop-blur-lg border-b border-border/60 px-5 py-3.5 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => nav(-1)} className="w-11 h-11 rounded-2xl active:scale-90 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-extrabold text-lg tracking-tight">Driver Dashboard</h1>
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEarningsOpen(!earningsOpen)}
              className="w-11 h-11 rounded-2xl text-muted-foreground active:scale-90 transition-all"
              title="Earnings"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTransactionsOpen(true)}
              className="w-11 h-11 rounded-2xl text-muted-foreground active:scale-90 transition-all"
            >
              <History className="h-5 w-5" />
            </Button>
            <WalletBalance
              balance={driverBalance}
              onClick={() => nav("/drivers/wallet")}
              size="sm"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
      <div className="max-w-lg mx-auto p-5 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 animate-fade-in">
          <div className="rounded-2xl p-3 text-center" style={{ background: 'var(--gradient-primary)' }}>
            <Star className="h-4 w-4 mx-auto text-primary-foreground/80 mb-1" />
            <p className="text-lg font-extrabold tabular-nums text-primary-foreground">{profile.rating_avg?.toFixed(1) || '—'}</p>
            <p className="text-[10px] text-primary-foreground/70 font-medium">Rating</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: 'var(--gradient-primary)' }}>
            <TrendingUp className="h-4 w-4 mx-auto text-primary-foreground/80 mb-1" />
            <p className="text-lg font-extrabold tabular-nums text-primary-foreground">{profile.total_trips || 0}</p>
            <p className="text-[10px] text-primary-foreground/70 font-medium">Trips</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: 'var(--gradient-primary)' }}>
            <Zap className="h-4 w-4 mx-auto text-primary-foreground/80 mb-1" />
            <p className="text-lg font-extrabold tabular-nums text-primary-foreground">${driverBalance % 1 === 0 ? driverBalance : driverBalance.toFixed(2)}</p>
            <p className="text-[10px] text-primary-foreground/70 font-medium">Wallet</p>
          </div>
        </div>

        {/* Earnings Dashboard (toggled via icon) */}
        {earningsOpen && (
          <DriverEarningsDashboard />
        )}

        {/* Navigation Map */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-56 rounded-xl overflow-hidden">
              <MapGoogle
                driverLocation={driverCoords ? { lat: driverCoords.lat, lng: driverCoords.lng } : undefined}
                pickup={activeTrip ? { lat: activeTrip.pickup_lat, lng: activeTrip.pickup_lon } : undefined}
                dropoff={activeTrip ? { lat: activeTrip.dropoff_lat, lng: activeTrip.dropoff_lon } : undefined}
                defaultCenter={driverCoords ? { lat: driverCoords.lat, lng: driverCoords.lng } : undefined}
                defaultZoom={15}
                className="w-full h-full"
              />
            </div>
          </CardContent>
        </Card>

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


        {/* Profile Photo Upload */}
        <Card>
          <CardContent className="pt-4">
            <p className="font-semibold text-sm mb-3">Profile Photo</p>
            <DriverAvatarUpload
              currentAvatarUrl={profile.avatar_url}
              gender={profile.gender}
              onUploaded={(url) => setProfile(prev => prev ? { ...prev, avatar_url: url } : prev)}
            />
          </CardContent>
        </Card>

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

        {activeTrip && (
          <DriverNavigationView
            driverLocation={driverCoords}
            pickupLocation={{ lat: activeTrip.pickup_lat, lng: activeTrip.pickup_lon }}
            dropoffLocation={{ lat: activeTrip.dropoff_lat, lng: activeTrip.dropoff_lon }}
            tripPhase={['accepted', 'enroute_pickup'].includes(activeTrip.status) ? 'to_pickup' : 'to_dropoff'}
          />
        )}

        {/* Active Trip */}
        {activeTrip && (
          <>
            <Card className="border-accent/40 bg-accent/5 backdrop-blur-sm">
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
                  <div className="text-right">
                    <p className="font-black text-lg">{fmtUSD(Number(activeTrip.fare))}</p>
                    {activeTrip.payment_method && activeTrip.payment_method !== 'cash' && (
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <CreditCard className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary capitalize">{activeTrip.payment_method}</span>
                      </div>
                    )}
                    {activeTrip.payment_method === 'cash' && (
                      <span className="text-xs text-muted-foreground">Cash</span>
                    )}
                  </div>
                </div>
                <Button
                  className="w-full bg-accent text-accent-foreground hover:brightness-105"
                  size="lg"
                  onClick={handleCompleteTrip}
                  disabled={completing}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {completing ? "Completing..." : "Complete Trip (15% commission)"}
                </Button>
              </CardContent>
            </Card>

            {/* Call Buttons: Data / Normal / WhatsApp */}
            <Card className="glass-card border-0">
              <CardContent className="pt-4 space-y-3">
                <p className="font-medium text-sm text-foreground flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-primary" /> Contact Rider
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <VoiceCallButton
                    onCall={startCall}
                    disabled={callStatus !== "idle"}
                    label="Data"
                    className="w-full text-xs"
                  />
                  <a
                    href={riderPhone ? `tel:${riderPhone.replace(/[^\d+]/g, "")}` : "#"}
                    className="flex items-center justify-center gap-1 py-3 rounded-2xl font-medium text-xs text-center active:scale-95 transition-all"
                    style={{ background: 'var(--gradient-primary)' }}
                  >
                    <Phone className="h-3.5 w-3.5 text-primary-foreground shrink-0" />
                    <span className="text-primary-foreground">Phone</span>
                  </a>
                  <a
                    href={riderPhone ? `https://wa.me/${riderPhone.replace(/[^\d]/g, "")}` : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-3 rounded-2xl bg-accent/80 backdrop-blur-sm text-accent-foreground font-medium text-xs text-center active:scale-95 transition-all"
                  >
                    💬 <span>WhatsApp</span>
                  </a>
                </div>
                {!riderPhone && (
                  <p className="text-xs text-muted-foreground">Rider phone not available — use Call (Data) for in-app voice.</p>
                )}
              </CardContent>
            </Card>

            {/* Communication with Rider */}
            <Card className="glass-card border-0">
              <CardContent className="pt-4">
                <RideCommunication
                  rideId={activeTrip.id}
                  currentUserId={user!.id}
                  otherUserPhone={riderPhone}
                  riderId={activeTrip.user_id}
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* inDrive-style Negotiation Link */}
        <Card className="border-dashed border-primary/40">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Negotiate Fares</p>
                <p className="text-xs text-muted-foreground">Browse & bid on rider requests (inDrive style)</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => nav('/negotiate/driver')}>
                View Requests
              </Button>
            </div>
          </CardContent>
        </Card>

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
                        <p className="font-black text-lg">${Number(r.fare).toFixed(2)}</p>
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
                  <p className="text-3xl font-black">
                    ${offerPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Increments of $0.50
                  </p>
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
                {submitting ? "Sending..." : `Send Offer • $${offerPrice.toFixed(2)}`}
              </Button>
            </div>
          </div>
        )}

        {/* Driver Settings */}
        <div>
          <p className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Settings</p>
          <DriverSettingsPanel
            driverId={profile.id}
            initialArea={(profile as Record<string, unknown>).preferred_service_area as string || 'both'}
            initialEarningNotif={(profile as Record<string, unknown>).earning_notifications as boolean ?? true}
            initialEcocash={(profile as Record<string, unknown>).ecocash_number as string || ''}
          />
        </div>

        {/* Suggestions & Complaints */}
        <DriverFeedback />

        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => { setDepositModalOpen(false); fetchDriverBalance(); }}
        onDeposit={async (amount: number, desc?: string) => {
          // Driver deposits go through the deposit request flow, not direct
          return { error: 'Use the deposit page at /drivers/deposit' };
        }}
        currentBalance={driverBalance}
      />

      {/* Transactions Sheet */}
      <TransactionsSheet
        isOpen={transactionsOpen}
        onClose={() => setTransactionsOpen(false)}
        transactions={[]}
        title="Wallet History"
      />
    </div>
  );
}
