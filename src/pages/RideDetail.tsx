import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { joinRidePresence, countDriversViewing } from "@/lib/koloiRealtime";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import TripGoogleMap from "@/components/TripGoogleMap";
import { useDriverTracking } from "@/hooks/useDriverTracking";
import IncomingCallModal from "@/components/ride/IncomingCallModal";
import ActiveCallOverlay from "@/components/ride/ActiveCallOverlay";
import PremiumOffersSheet from "@/components/ride/PremiumOffersSheet";
import { type PremiumOffer } from "@/components/ride/PremiumOfferCard";
import { ArrowLeft, MessageCircle, Phone, Shield, Star, Car, ChevronDown, ChevronUp, MapPin, Navigation, X, Send } from "lucide-react";

function SettlementInfo({ tripId }: { tripId: string }) {
  const [settlement, setSettlement] = useState<{ status: string; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    supabase
      .from("platform_ledger")
      .select("status, created_at")
      .eq("trip_id", tripId)
      .maybeSingle()
      .then(({ data }) => {
        setSettlement(data);
        setLoading(false);
      });
  }, [tripId]);

  const handleSettle = async () => {
    setSettling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await supabase.functions.invoke("settle-trip", { body: { tripId } });
      const { data } = await supabase.from("platform_ledger").select("status, created_at").eq("trip_id", tripId).maybeSingle();
      setSettlement(data);
    } catch (err: unknown) { console.warn("Settlement fetch failed:", err); }
    setSettling(false);
  };

  if (loading) return <div className="mt-3 h-12 rounded-2xl bg-muted animate-pulse" />;
  if (settlement) {
    return (
      <div className="mt-3 px-4 py-3 bg-primary/10 rounded-2xl text-sm text-primary font-semibold">
        <p>Trip completed ✓</p>
        <p className="text-xs text-muted-foreground mt-0.5">Settled • {new Date(settlement.created_at).toLocaleString()}</p>
      </div>
    );
  }
  return (
    <button onClick={handleSettle} disabled={settling}
      className="mt-3 w-full py-3 rounded-2xl border border-white/30 bg-primary/20 backdrop-blur-xl text-primary font-bold text-sm active:scale-[0.98] transition-all shadow-[0_4px_16px_hsl(var(--primary)/0.2)]">
      {settling ? "Settling..." : "Settle Now"}
    </button>
  );
}

type RideRow = {
  id: string; user_id: string; pickup_address: string | null; dropoff_address: string | null;
  fare: number | null; status: string | null; pickup_lat?: number | null; pickup_lon?: number | null;
  dropoff_lat?: number | null; dropoff_lon?: number | null; driver_id?: string | null;
};
type OfferRow = {
  id: string; ride_id: string; driver_id: string; price: number;
  eta_minutes: number | null; message: string | null; status: string | null; created_at?: string | null;
};
type MessageRow = { id: string; ride_id: string; sender_id: string; text: string; created_at?: string | null; };
type DriverProfile = {
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  ratingAvg: number;
  totalTrips: number;
  vehicleMake: string | null;
  vehicleModel: string | null;
  plateNumber: string | null;
  carColor: string;
  etaMinutes: number | null;
};

function msLeftFromCreatedAt(created_at?: string | null, windowMs = 60_000) {
  if (!created_at) return 0;
  const t = new Date(created_at).getTime();
  return Math.max(0, windowMs - (Date.now() - t));
}

export default function RideDetail() {
  const { rideId } = useParams();
  const nav = useNavigate();
  const [userId, setUserId] = useState("");
  const [ride, setRide] = useState<RideRow | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [driversViewing, setDriversViewing] = useState(0);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [msgText, setMsgText] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [premiumOffers, setPremiumOffers] = useState<PremiumOffer[]>([]);
  const [driverUserIdForTracking, setDriverUserIdForTracking] = useState<string | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);

  useEffect(() => {
    if (!ride?.driver_id) { setDriverUserIdForTracking(null); return; }
    (async () => {
      const { data } = await supabase.from("drivers").select("user_id").eq("id", ride.driver_id!).maybeSingle();
      if (data) setDriverUserIdForTracking(data.user_id);
    })();
  }, [ride?.driver_id]);

  useEffect(() => {
    if (!ride?.driver_id) { setDriverProfile(null); return; }
    (async () => {
      const { data: d } = await supabase
        .from("drivers")
        .select("user_id, vehicle_make, vehicle_model, plate_number, rating_avg, total_trips, avatar_url")
        .eq("id", ride.driver_id)
        .maybeSingle();
      if (!d) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", d.user_id)
        .maybeSingle();

      const acceptedOffer = offers.find((o) => o.driver_id === d.user_id);
      setDriverProfile({
        fullName: p?.full_name || "Your driver",
        phone: p?.phone || null,
        avatarUrl: d.avatar_url || null,
        ratingAvg: Number(d.rating_avg || 0),
        totalTrips: Number(d.total_trips || 0),
        vehicleMake: d.vehicle_make || null,
        vehicleModel: d.vehicle_model || null,
        plateNumber: d.plate_number || null,
        carColor: "Not listed",
        etaMinutes: acceptedOffer?.eta_minutes ?? null,
      });
    })();
  }, [ride?.driver_id, offers]);

  const driverLocation = useDriverTracking(driverUserIdForTracking, ride?.status ?? null);
  const accepted = useMemo(() => !!ride?.driver_id, [ride]);

  const { callStatus, isMuted, isSpeaker, callDuration, incomingCall, startCall, answerCall,
    declineCall: declineIncomingCall, endCall, toggleMute, toggleSpeaker
  } = useWebRTCCall({ rideId: rideId ?? null, currentUserId: userId, otherUserId: driverUserIdForTracking });

  useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); if (data?.user) setUserId(data.user.id); })(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = async (silent = false) => {
    if (!rideId) return;
    if (!silent) setLoading(true);
    try {
      const { data: r, error: rErr } = await supabase.from("rides").select("*").eq("id", rideId).single();
      if (rErr) throw new Error(rErr.message);
      setRide(r as RideRow);
      const { data: o } = await supabase.from("offers").select("*").eq("ride_id", rideId).order("created_at", { ascending: false });
      const rawOffers = o as OfferRow[] || [];
      setOffers(rawOffers);

      const pendingRaw = rawOffers.filter((off) => off.status === "pending");
      if (pendingRaw.length > 0) {
        const driverIds = pendingRaw.map((off) => off.driver_id);
        const [driversRes, profilesRes] = await Promise.all([
          supabase.from("drivers").select("user_id, vehicle_make, vehicle_model, plate_number, rating_avg, total_trips, gender, avatar_url").in("user_id", driverIds),
          supabase.from("profiles").select("user_id, full_name").in("user_id", driverIds)
        ]);
        const driverMap: Record<string, typeof driversRes.data extends (infer T)[] ? T : never> = {};
        for (const d of driversRes.data ?? []) driverMap[d.user_id] = d;
        const profileMap: Record<string, string> = {};
        for (const p of profilesRes.data ?? []) if (p.full_name) profileMap[p.user_id] = p.full_name;

        const OFFER_WINDOW_MS = 60_000;
        const premium: PremiumOffer[] = pendingRaw.map((off) => {
          const d = driverMap[off.driver_id];
          const createdMs = off.created_at ? new Date(off.created_at).getTime() : Date.now();
          return {
            offerId: off.id, driverId: off.driver_id,
            driverName: profileMap[off.driver_id] || 'Driver',
            avatarUrl: d?.avatar_url ?? null,
            ratingAvg: Number(d?.rating_avg ?? 0),
            totalTrips: Number(d?.total_trips ?? 0),
            carModel: d ? `${d.vehicle_make || ''} ${d.vehicle_model || ''}`.trim() || 'Vehicle' : 'Vehicle',
            plateNumber: d?.plate_number || '—',
            etaMinutes: off.eta_minutes ?? 5,
            fare: off.price,
            gender: d?.gender ?? null,
            acceptedAt: createdMs,
            expiresAt: createdMs + OFFER_WINDOW_MS
          };
        });
        setPremiumOffers(premium);
      } else {
        setPremiumOffers([]);
      }

      const { data: m } = await supabase.from("messages").select("*").eq("ride_id", rideId).order("created_at", { ascending: true });
      setMessages(m as MessageRow[] || []);
    } catch (e: unknown) { setToast((e as Error)?.message || "Failed to load ride."); } finally { setLoading(false); }
  };

  useEffect(() => { load(false); }, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    const ch = supabase
      .channel(`db:ride:${rideId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `ride_id=eq.${rideId}` }, () => load(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: `id=eq.${rideId}` }, () => load(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    let pres: import("@supabase/supabase-js").RealtimeChannel | null = null;
    (async () => {
      pres = await joinRidePresence(rideId, { role: "rider", name: "rider" });
      pres.on("presence", { event: "sync" }, () => {
        const state = pres!.presenceState() as Record<string, unknown[]>;
        setDriversViewing(countDriversViewing(state));
      });
    })();
    return () => { if (pres) supabase.removeChannel(pres); };
  }, [rideId]);

  const canAcceptNow = (offer: OfferRow) => msLeftFromCreatedAt(offer.created_at, 60_000) > 0 && offer.status === "pending" && !accepted;

  const acceptOffer = async (offer: OfferRow) => {
    if (!ride || !rideId || !canAcceptNow(offer)) { setToast("This offer expired."); return; }
    setAcceptingOfferId(offer.id);
    try {
      const { data: driverData, error: driverErr } = await supabase.from("drivers").select("id").eq("user_id", offer.driver_id).maybeSingle();
      if (driverErr) throw new Error(driverErr.message);
      if (!driverData) throw new Error("Driver record not found");
      await supabase.from("offers").update({ status: "accepted" }).eq("id", offer.id);
      await supabase.from("offers").update({ status: "rejected" }).eq("ride_id", rideId).neq("id", offer.id);
      await supabase.from("rides").update({ driver_id: driverData.id, status: "accepted" }).eq("id", rideId);
      setToast("Driver accepted ✅");
      setShowOffersModal(false);
    } catch (e: unknown) { setToast((e as Error)?.message || "Failed to accept offer."); } finally { setAcceptingOfferId(null); }
  };

  const sendMessage = async () => {
    if (!rideId || !msgText.trim()) return;
    try {
      const { error } = await supabase.from("messages").insert({ ride_id: rideId, sender_id: userId, text: msgText.trim() });
      if (error) throw new Error(error.message);
      setMsgText("");
    } catch (e: unknown) { setToast((e as Error)?.message || "Message failed."); }
  };

  const sendQuickReply = async (text: string) => {
    if (!rideId || !text.trim()) return;
    try {
      const { error } = await supabase.from("messages").insert({ ride_id: rideId, sender_id: userId, text: text.trim() });
      if (error) throw new Error(error.message);
    } catch (e: unknown) { setToast((e as Error)?.message || "Message failed."); }
  };

  // ── LOADING or NOT FOUND — show inline, never full-screen blank ──
  if (loading || !ride) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
        {/* Animated map placeholder */}
        <div className="absolute inset-0 bg-gradient-to-b from-muted/40 via-muted/20 to-background">
          {/* Animated road lines */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute h-px bg-primary/40"
                style={{
                  top: `${20 + i * 15}%`,
                  left: 0,
                  right: 0,
                  animation: `shimmer ${2 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
          {/* Pulsing car icon */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Car className="w-7 h-7 text-primary animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="absolute top-0 left-0 right-0 z-40 px-4 flex items-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
          <button onClick={() => nav("/ride")} className="w-11 h-11 flex items-center justify-center rounded-full bg-card shadow-md active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Bottom panel */}
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
          <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-border" /></div>
          <div className="px-5 pb-5 space-y-4">
            {loading ? (
              <>
                {/* Live status indicator */}
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                    <div className="absolute w-3 h-3 rounded-full bg-primary/50 animate-ping" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Loading your ride</p>
                    <p className="text-xs text-muted-foreground">Getting the latest details…</p>
                  </div>
                </div>

                {/* Pickup/Dropoff skeleton with route line */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 rounded-full border-2 border-primary bg-card" />
                    <div className="w-0.5 flex-1 bg-gradient-to-b from-primary/40 to-accent/40 my-1 rounded-full min-h-[24px]" />
                    <div className="w-3 h-3 rounded-full border-2 border-accent bg-card" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1.5">
                      <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                      <div className="h-5 w-3/4 rounded-lg bg-muted animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                      <div className="h-5 w-2/3 rounded-lg bg-muted animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Fare skeleton */}
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/50">
                  <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-6 w-16 rounded-lg bg-muted animate-pulse" />
                </div>
              </>
            ) : (
              <div className="text-center py-6 space-y-3">
                <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto">
                  <Car className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-base font-semibold text-foreground">Ride not found</p>
                <p className="text-sm text-muted-foreground">This trip may no longer be available.</p>
                <button onClick={() => nav("/ride")} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold active:scale-[0.98] transition-all">
                  Back to rides
                </button>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.1; transform: scaleX(0.8); }
            50% { opacity: 0.3; transform: scaleX(1); }
          }
        `}</style>
      </div>
    );
  }

  const rideStatus = ride.status ?? "pending";
  const isSearching = rideStatus === "pending" || rideStatus === "searching";
  const isActive = ["accepted", "driver_arriving", "driver_arrived", "in_progress", "near_destination"].includes(rideStatus);
  const isCompleted = rideStatus === "completed";
  const isCancelled = rideStatus === "cancelled";

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: "Looking for drivers", color: "bg-amber-500", icon: "🔍" },
    searching: { label: "Looking for drivers", color: "bg-amber-500", icon: "🔍" },
    accepted: { label: "Driver accepted", color: "bg-primary", icon: "✓" },
    driver_arriving: { label: "Driver on the way", color: "bg-primary", icon: "🚗" },
    driver_arrived: { label: "Driver has arrived", color: "bg-primary", icon: "📍" },
    in_progress: { label: "Trip in progress", color: "bg-primary", icon: "🛣️" },
    near_destination: { label: "Almost there", color: "bg-primary", icon: "🏁" },
    completed: { label: "Trip completed", color: "bg-primary", icon: "✅" },
    cancelled: { label: "Trip cancelled", color: "bg-destructive", icon: "✕" },
  };

  const status = statusConfig[rideStatus] || { label: rideStatus, color: "bg-muted", icon: "•" };
  const pendingOfferCount = premiumOffers.filter((o) => o.expiresAt > Date.now()).length;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Call overlays */}
      {callStatus !== "idle" &&
        <ActiveCallOverlay status={callStatus} duration={callDuration} isMuted={isMuted} isSpeaker={isSpeaker}
          onToggleMute={toggleMute} onToggleSpeaker={toggleSpeaker} onEndCall={endCall} otherUserName="Rider" />
      }
      {incomingCall && <IncomingCallModal callerId={incomingCall.callerId} onAnswer={answerCall} onDecline={declineIncomingCall} />}

      {/* Map — takes top portion */}
      <div className="absolute inset-0 bottom-0">
        {ride.pickup_lat != null && ride.pickup_lon != null && ride.dropoff_lat != null && ride.dropoff_lon != null ? (
          <TripGoogleMap
            pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lon! }}
            dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lon! }}
            driverLocation={driverLocation}
            tripStatus={ride.status ?? "pending"}
            height="100%" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <p className="text-sm font-medium text-muted-foreground">Map unavailable</p>
          </div>
        )}
      </div>

      {/* Back button */}
      <div className="absolute top-0 left-0 right-0 z-40 px-4 flex items-center justify-between" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button onClick={() => nav("/ride")} className="w-11 h-11 flex items-center justify-center rounded-full bg-card shadow-md active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        {accepted && (
          <button onClick={() => setChatOpen(v => !v)} className="w-11 h-11 flex items-center justify-center rounded-full bg-card shadow-md active:scale-95 transition-all relative">
            <MessageCircle className="w-5 h-5 text-foreground" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full text-[10px] text-primary-foreground font-bold flex items-center justify-center">
                {messages.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Bottom Panel — inDrive style ── */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-4 pb-3 space-y-2 max-h-[40vh] overflow-y-auto">

          {/* Status + fare — single compact row */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status.color} ${isSearching ? 'animate-pulse' : ''}`} />
            <p className="text-xs font-semibold text-foreground flex-1 truncate">{status.label}</p>
            {isSearching && (
              <span className="text-[10px] text-muted-foreground">{driversViewing} nearby</span>
            )}
            <span className="text-sm font-bold text-foreground">${Number(ride.fare ?? 0).toFixed(2)}</span>
          </div>

          {/* Route info — ultra compact */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-muted/40">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <div className="w-px h-3 bg-border" />
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">{ride.pickup_address ?? "My location"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{ride.dropoff_address ?? "—"}</p>
            </div>
          </div>

          {/* Action buttons — compact row */}
          {driverProfile && (
            <div className="flex items-center gap-1.5">
              <button onClick={startCall} disabled={callStatus !== "idle"}
                className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all disabled:opacity-50">
                <Phone className="w-3.5 h-3.5" /> Call
              </button>
              <button onClick={() => setChatOpen(v => !v)}
                className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all">
                <MessageCircle className="w-3.5 h-3.5" /> Message
              </button>
              <button onClick={() => setToast("Safety center coming soon")}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-[0.97] transition-all">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Settlement for completed trips */}
          {isCompleted && <SettlementInfo tripId={ride.id} />}

          {/* View Offers button */}
          {!accepted && (
            <button onClick={() => setShowOffersModal(true)}
              className={`w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base inline-flex items-center justify-center gap-0.5 active:scale-[0.98] transition-all shadow-[var(--shadow-md)] ${pendingOfferCount > 0 ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}`}>
              View Offers {pendingOfferCount > 0 && `(${pendingOfferCount})`}
            </button>
          )}

          {/* Cancel button */}
          {(isSearching || isActive) && (
            <button
              onClick={async () => {
                if (!rideId) return;
                if (!window.confirm("Cancel this ride request?")) return;
                await supabase.from("rides").update({ status: "cancelled" }).eq("id", rideId);
                nav("/ride");
              }}
              className="w-full h-9 rounded-xl border border-white/30 bg-destructive/20 backdrop-blur-xl text-destructive font-semibold text-xs inline-flex items-center justify-center active:scale-[0.98] transition-all shadow-[0_4px_16px_hsl(var(--destructive)/0.2)]">
              Cancel Ride
            </button>
          )}

          {/* Chat panel — inline expand */}
          {accepted && chatOpen && (
            <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">Messages</h3>
                <button onClick={() => setChatOpen(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Quick replies */}
              <div className="flex flex-wrap gap-1.5">
                {["I'm here", "On my way", "Call me", "Okay"].map((q) => (
                  <button key={q} onClick={() => sendQuickReply(q)}
                    className="px-2.5 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground active:scale-95 transition-all">
                    {q}
                  </button>
                ))}
              </div>

              {/* Messages list */}
              <div className="h-40 overflow-y-auto space-y-2 bg-muted/30 rounded-xl p-2.5">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No messages yet</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                        m.sender_id === userId
                          ? "bg-blue-500 text-white rounded-bl-sm"
                          : "bg-amber-400 text-amber-950 rounded-br-sm"
                      }`}>
                        <p className="text-sm">{m.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input type="text" value={msgText} onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message…"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/25 text-foreground text-sm" />
                <button onClick={sendMessage} disabled={!msgText.trim()}
                  className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Premium Offers Sheet */}
      <PremiumOffersSheet
        isOpen={showOffersModal}
        offers={premiumOffers}
        riderFare={Number(ride.fare ?? 0)}
        onAccept={async (offerId) => {
          const offer = offers.find((o) => o.id === offerId);
          if (offer) await acceptOffer(offer);
        }}
        onDecline={async (offerId) => {
          await supabase.from("offers").update({ status: "rejected" }).eq("id", offerId);
          setPremiumOffers((prev) => prev.filter((o) => o.offerId !== offerId));
        }}
        onCancel={async () => {
          if (rideId) await supabase.from("rides").update({ status: "cancelled" }).eq("id", rideId);
          nav("/ride");
        }}
        onClose={() => setShowOffersModal(false)} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 z-[9999] p-4 rounded-2xl bg-card border border-border shadow-lg text-sm font-medium text-foreground text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
