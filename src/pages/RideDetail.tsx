import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { joinRidePresence, countDriversViewing } from "@/lib/koloiRealtime";
import { useAgoraCall } from "@/hooks/useAgoraCall";
import TripGoogleMap from "@/components/TripGoogleMap";
import { useDriverTracking } from "@/hooks/useDriverTracking";
import IncomingCallModal from "@/components/ride/IncomingCallModal";
import ActiveCallOverlay from "@/components/ride/ActiveCallOverlay";
import PremiumOffersSheet from "@/components/ride/PremiumOffersSheet";
import { type PremiumOffer } from "@/components/ride/PremiumOfferCard";
import { ArrowLeft, MessageCircle, Phone, Shield, Star, Car, ChevronDown, ChevronUp } from "lucide-react";

function SettlementInfo({ tripId }: {tripId: string;}) {
  const [settlement, setSettlement] = useState<{status: string;created_at: string;} | null>(null);
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
    } catch (err: unknown) {console.warn("Settlement fetch failed:", err);}
    setSettling(false);
  };

  if (loading) return null;
  if (settlement) {
    return (
      <div className="mt-2 px-3 py-2 bg-primary/10 rounded-xl text-sm text-primary font-semibold space-y-1">
        <p>Trip completed </p>
        <p className="text-xs text-muted-foreground">Settled • {new Date(settlement.created_at).toLocaleString()}</p>
      </div>);

  }
  return (
    <button onClick={handleSettle} disabled={settling}
    className="mt-2 w-full py-2 rounded-xl glass-card font-bold text-sm hover:bg-foreground/[0.02] active:scale-[0.98] transition-all">
      {settling ? "Settling..." : "Settle Now"}
    </button>);

}

type RideRow = {
  id: string;user_id: string;pickup_address: string | null;dropoff_address: string | null;
  fare: number | null;status: string | null;pickup_lat?: number | null;pickup_lon?: number | null;
  dropoff_lat?: number | null;dropoff_lon?: number | null;driver_id?: string | null;
};
type OfferRow = {
  id: string;ride_id: string;driver_id: string;price: number;
  eta_minutes: number | null;message: string | null;status: string | null;created_at?: string | null;
};
type MessageRow = {id: string;ride_id: string;sender_id: string;text: string;created_at?: string | null;};
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
    if (!ride?.driver_id) {setDriverUserIdForTracking(null);return;}
    (async () => {
      const { data } = await supabase.from("drivers").select("user_id").eq("id", ride.driver_id!).maybeSingle();
      if (data) setDriverUserIdForTracking(data.user_id);
    })();
  }, [ride?.driver_id]);

  useEffect(() => {
    if (!ride?.driver_id) {
      setDriverProfile(null);
      return;
    }
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
  } = useAgoraCall({ rideId: rideId ?? null, currentUserId: userId, otherUserId: ride?.user_id ?? null });

  useEffect(() => {(async () => {const { data } = await supabase.auth.getUser();if (data?.user) setUserId(data.user.id);})();}, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = async () => {
    if (!rideId) return;
    setLoading(true);
    try {
      const { data: r, error: rErr } = await supabase.from("rides").select("*").eq("id", rideId).single();
      if (rErr) throw new Error(rErr.message);
      setRide(r as RideRow);
      const { data: o } = await supabase.from("offers").select("*").eq("ride_id", rideId).order("created_at", { ascending: false });
      const rawOffers = o as OfferRow[] || [];
      setOffers(rawOffers);

      // Enrich pending offers with driver profile data
      const pendingRaw = rawOffers.filter((off) => off.status === "pending");
      if (pendingRaw.length > 0) {
        const driverIds = pendingRaw.map((off) => off.driver_id);
        const [driversRes, profilesRes] = await Promise.all([
        supabase.from("drivers").select("user_id, vehicle_make, vehicle_model, plate_number, rating_avg, total_trips, gender, avatar_url").in("user_id", driverIds),
        supabase.from("profiles").select("user_id, full_name").in("user_id", driverIds)]
        );
        const driverMap: Record<string, typeof driversRes.data extends (infer T)[] ? T : never> = {};
        for (const d of driversRes.data ?? []) driverMap[d.user_id] = d;
        const profileMap: Record<string, string> = {};
        for (const p of profilesRes.data ?? []) if (p.full_name) profileMap[p.user_id] = p.full_name;

        const OFFER_WINDOW_MS = 60_000;
        const premium: PremiumOffer[] = pendingRaw.map((off) => {
          const d = driverMap[off.driver_id];
          const createdMs = off.created_at ? new Date(off.created_at).getTime() : Date.now();
          return {
            offerId: off.id,
            driverId: off.driver_id,
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
    } catch (e: unknown) {setToast((e as Error)?.message || "Failed to load ride.");} finally
    {setLoading(false);}
  };

  useEffect(() => {load();}, [rideId]);

  useEffect(() => {
    if (!rideId) return;
    const ch = supabase
      .channel(`db:ride:${rideId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `ride_id=eq.${rideId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: `id=eq.${rideId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` }, () => load())
      .subscribe();
    return () => {supabase.removeChannel(ch);};
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
    return () => {if (pres) supabase.removeChannel(pres);};
  }, [rideId]);

  const canAcceptNow = (offer: OfferRow) => msLeftFromCreatedAt(offer.created_at, 60_000) > 0 && offer.status === "pending" && !accepted;

  const acceptOffer = async (offer: OfferRow) => {
    if (!ride || !rideId || !canAcceptNow(offer)) {setToast("This offer expired.");return;}
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
    } catch (e: unknown) {setToast((e as Error)?.message || "Failed to accept offer.");} finally
    {setAcceptingOfferId(null);}
  };

  const sendMessage = async () => {
    if (!rideId || !msgText.trim()) return;
    try {
      const { error } = await supabase.from("messages").insert({ ride_id: rideId, sender_id: userId, text: msgText.trim() });
      if (error) throw new Error(error.message);
      setMsgText("");
    } catch (e: unknown) {setToast((e as Error)?.message || "Message failed.");}
  };

  const sendQuickReply = async (text: string) => {
    if (!rideId || !text.trim()) return;
    try {
      const { error } = await supabase.from("messages").insert({ ride_id: rideId, sender_id: userId, text: text.trim() });
      if (error) throw new Error(error.message);
      setMsgText("");
    } catch (e: unknown) {
      setToast((e as Error)?.message || "Message failed.");
    }
  };

  const OfferTimer = ({ offer }: {offer: OfferRow;}) => {
    const [leftMs, setLeftMs] = useState(msLeftFromCreatedAt(offer.created_at, 60_000));
    useEffect(() => {const t = setInterval(() => setLeftMs(msLeftFromCreatedAt(offer.created_at, 60_000)), 200);return () => clearInterval(t);}, [offer.created_at]);
    const sec = Math.ceil(leftMs / 1000);
    return <span className={`text-sm font-bold ${sec > 0 ? "text-primary" : "text-muted-foreground"}`}>{sec > 0 ? `${sec}s` : "Expired"}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card-heavy rounded-full px-6 py-3 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-foreground">Loading…</span>
        </div>
      </div>);

  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_18px_44px_rgba(15,23,42,0.16)] p-5 text-center space-y-4">
          <p className="text-base font-semibold text-slate-900">Ride not found</p>
          <p className="text-sm text-slate-600">This trip may no longer be available.</p>
          <button
            onClick={() => nav("/ride")}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold shadow-[0_8px_20px_rgba(37,99,235,0.32)]"
          >
            Back to rides
          </button>
        </div>
      </div>);

  }

  const rideStatus = ride.status ?? "pending";

  const statusLabel = (() => {
    switch (rideStatus) {
      case "pending": return "Looking for drivers";
      case "searching": return "Looking for drivers";
      case "accepted": return "Driver accepted";
      case "driver_arriving": return "Driver is on the way";
      case "driver_arrived": return "Driver has arrived";
      case "in_progress": return "Trip in progress";
      case "near_destination": return "Near destination";
      case "completed": return "Trip completed";
      case "cancelled": return "Trip cancelled";
      default: return "Trip update";
    }
  })();

  const statusProgress = (() => {
    switch (rideStatus) {
      case "pending": return 8;
      case "searching": return 12;
      case "accepted": return 25;
      case "driver_arriving": return 40;
      case "driver_arrived": return 55;
      case "in_progress": return 80;
      case "near_destination": return 92;
      case "completed": return 100;
      case "cancelled": return 100;
      default: return 10;
    }
  })();

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Call overlays */}
      {callStatus !== "idle" &&
      <ActiveCallOverlay status={callStatus} duration={callDuration} isMuted={isMuted} isSpeaker={isSpeaker}
      onToggleMute={toggleMute} onToggleSpeaker={toggleSpeaker} onEndCall={endCall} otherUserName="Rider" />
      }
      {incomingCall && <IncomingCallModal callerId={incomingCall.callerId} onAnswer={answerCall} onDecline={declineIncomingCall} />}

      {/* Map */}
      <div className="absolute inset-0">
        {ride.pickup_lat != null && ride.pickup_lon != null && ride.dropoff_lat != null && ride.dropoff_lon != null ?
        <TripGoogleMap
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lon! }}
          dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lon! }}
          driverLocation={driverLocation}
          tripStatus={ride.status ?? "pending"}
          height="100%" />
        :
        <div className="absolute inset-0 flex items-center justify-center p-5">
            <div className="rounded-2xl border border-white/60 bg-white/75 backdrop-blur-xl px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.14)]">
              Map preview unavailable for this trip
            </div>
          </div>
        }
        <div className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, hsl(217 85% 29% / 0.12), transparent)' }} />
      </div>

      {/* Glass header */}
      <div className="absolute top-0 left-0 right-0 z-40 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <div className="flex items-center justify-between">
          <button onClick={() => nav("/ride")} className="w-11 h-11 flex items-center justify-center rounded-full glass-btn active:scale-95 transition-all glass-glow-blue">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          



          
        </div>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 z-50 max-h-[74vh] overflow-y-auto border-t border-white/70 bg-white/78 backdrop-blur-2xl shadow-[0_-18px_48px_rgba(15,23,42,0.25)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <div className="sticky top-0 pt-2.5 pb-2 z-10 bg-white/78 backdrop-blur-2xl" style={{ borderTopLeftRadius: 30, borderTopRightRadius: 30 }}>
          <div className="w-10 h-1 rounded-full bg-slate-400/70 mx-auto" />
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="rounded-3xl p-3.5 border border-white/70 bg-white/90 shadow-[0_10px_28px_rgba(15,23,42,0.14)]">
            <div className="mb-2.5">
              <p className="text-[15px] font-semibold text-slate-900">{statusLabel}</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${statusProgress}%` }} />
              </div>
              {!accepted && (
                <p className="text-[11px] text-slate-600 mt-1">{driversViewing} driver{driversViewing === 1 ? "" : "s"} nearby</p>
              )}
            </div>

            {driverProfile && (
              <div className="rounded-2xl border border-white/70 bg-white p-3 mb-2.5 shadow-sm">
                <div className="flex items-start gap-3">
                  {driverProfile.avatarUrl ? (
                    <img src={driverProfile.avatarUrl} alt={driverProfile.fullName} className="w-12 h-12 rounded-full object-cover border border-white/70" />
                  ) : (
                    <div className="w-12 h-12 rounded-full border border-white/70 bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {driverProfile.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{driverProfile.fullName}</p>
                    <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{driverProfile.ratingAvg > 0 ? driverProfile.ratingAvg.toFixed(1) : "New"}</span>
                      <span>• {driverProfile.totalTrips} trips</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 inline-flex items-center gap-1"><Car className="w-3 h-3" />{[driverProfile.vehicleMake, driverProfile.vehicleModel].filter(Boolean).join(" ") || "Vehicle"} • {driverProfile.carColor}</p>
                    <p className="text-xs text-slate-900 font-medium mt-0.5">Plate: {driverProfile.plateNumber || "—"}</p>
                  </div>
                  <div className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    ETA {driverProfile.etaMinutes ?? 3}m
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1 text-[11px] text-slate-600 mb-2.5">
              <p><span className="font-semibold text-slate-900">Pickup:</span> {ride.pickup_address ?? "My location"}</p>
              <p><span className="font-semibold text-slate-900">Drop-off:</span> {ride.dropoff_address ?? "—"}</p>
              <p><span className="font-semibold text-slate-900">Fare:</span> ${Number(ride.fare ?? 0).toFixed(2)}</p>
            </div>

            {ride.status === "completed" && <SettlementInfo tripId={ride.id} />}

            {!accepted ? (
              <button onClick={() => setShowOffersModal(true)} className="w-full mt-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold active:scale-[0.98] transition-all shadow-[0_8px_20px_rgba(37,99,235,0.32)]">
                View Offers ({premiumOffers.filter((o) => o.expiresAt > Date.now()).length})
              </button>
            ) : (
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button onClick={startCall} disabled={callStatus !== "idle"} className="h-9 px-3 rounded-full bg-white border border-slate-200 text-slate-900 text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </button>
                  <button onClick={() => setChatOpen((v) => !v)} className="h-9 px-3 rounded-full bg-white border border-slate-200 text-slate-900 text-xs font-medium inline-flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" /> Chat {chatOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setToast("Safety center coming soon")} className="h-9 w-9 rounded-full bg-white border border-slate-200 text-slate-900 inline-flex items-center justify-center">
                    <Shield className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={async () => {
                    if (!rideId) return;
                    if (!window.confirm("Cancel this ride request?")) return;
                    await supabase.from("rides").update({ status: "cancelled" }).eq("id", rideId);
                    nav("/ride");
                  }}
                  className="text-xs font-semibold text-destructive px-2 py-1 rounded-lg hover:bg-destructive/10"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {accepted && chatOpen && (
            <div id="voyex-chat" className="rounded-2xl p-3 border border-white/70 bg-white/88 backdrop-blur-xl shadow-sm">
              <h3 className="font-semibold text-sm mb-2 text-slate-900">Chat</h3>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {[
                  "I'm here",
                  "Call me",
                  "I'll be outside",
                  "Okay",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendQuickReply(q)}
                    className="px-2 py-1.5 rounded-full text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="h-44 overflow-y-auto space-y-2 mb-2.5 bg-slate-50 rounded-xl p-2.5">
                {messages.length === 0 ?
              <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p> :

              messages.map((m) =>
              <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                m.sender_id === userId ? "bg-primary text-primary-foreground" : "glass-card"}`
                }>
                        <p className="text-sm">{m.text}</p>
                      </div>
                    </div>
              )
              }
              </div>
              <div className="flex gap-2">
                <input type="text" value={msgText} onChange={(e) => setMsgText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message…"
              className="flex-1 px-3 py-2.5 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-primary/25 text-slate-900 text-sm" />
                <button onClick={sendMessage} disabled={!msgText.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all">
                  Send
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
        <div className="fixed bottom-4 left-4 right-4 z-[9999] p-4 rounded-2xl glass-card-heavy text-sm font-medium text-foreground">
          {toast}
        </div>
      )}
    </div>
  );
}