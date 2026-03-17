import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { clampTo5 } from "@/lib/koloiMoney";
import { joinRidePresence, countDriversViewing } from "@/lib/koloiRealtime";
import { useAgoraCall } from "@/hooks/useAgoraCall";
import TripGoogleMap from "@/components/TripGoogleMap";
import { useDriverTracking } from "@/hooks/useDriverTracking";
import NavigationCard from "@/components/driver/NavigationCard";
import IncomingCallModal from "@/components/ride/IncomingCallModal";
import ActiveCallOverlay from "@/components/ride/ActiveCallOverlay";
import VoiceCallButton from "@/components/ride/VoiceCallButton";
import PremiumOffersSheet from "@/components/ride/PremiumOffersSheet";
import { type PremiumOffer } from "@/components/ride/PremiumOfferCard";
import { ArrowLeft, Eye, Users, MessageCircle, Clock, Phone } from "lucide-react";

function SettlementInfo({ tripId }: {tripId: string;}) {
  const [settlement, setSettlement] = useState<{status: string;created_at: string;} | null>(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    supabase.
    from("platform_ledger").
    select("status, created_at").
    eq("trip_id", tripId).
    maybeSingle().
    then(({ data }) => {setSettlement(data);setLoading(false);});
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
        <p>Trip completed ✅</p>
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
  const [selectedOffer, setSelectedOffer] = useState<OfferRow | null>(null);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [msgText, setMsgText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [premiumOffers, setPremiumOffers] = useState<PremiumOffer[]>([]);
  const [driverUserIdForTracking, setDriverUserIdForTracking] = useState<string | null>(null);

  useEffect(() => {
    if (!ride?.driver_id) {setDriverUserIdForTracking(null);return;}
    (async () => {
      const { data } = await supabase.from("drivers").select("user_id").eq("id", ride.driver_id!).maybeSingle();
      if (data) setDriverUserIdForTracking(data.user_id);
    })();
  }, [ride?.driver_id]);

  const driverLocation = useDriverTracking(driverUserIdForTracking, ride?.status ?? null);
  const accepted = useMemo(() => !!ride?.driver_id, [ride]);

  const { callStatus, isMuted, isSpeaker, callDuration, incomingCall, startCall, answerCall,
    declineCall: declineIncomingCall, endCall, toggleMute, toggleSpeaker
  } = useAgoraCall({ rideId: rideId ?? null, currentUserId: userId, otherUserId: ride?.user_id ?? null });

  useEffect(() => {(async () => {const { data } = await supabase.auth.getUser();if (data?.user) setUserId(data.user.id);})();}, []);

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
    const ch = supabase.channel(`db:ride:${rideId}`).
    on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `ride_id=eq.${rideId}` }, () => load()).
    on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: `id=eq.${rideId}` }, () => load()).
    on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` }, () => load()).
    subscribe();
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
      <div className="min-h-screen bg-background p-4">
        <p className="text-center text-muted-foreground mb-4">Ride not found</p>
        <button onClick={() => nav("/ride")} className="w-full py-3 rounded-2xl glass-card font-bold">Back</button>
      </div>);

  }

  const pendingOffers = offers.filter((o) => o.status === "pending");

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
        {ride.pickup_lat != null && ride.dropoff_lat != null &&
        <TripGoogleMap
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lon! }}
          dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lon! }}
          driverLocation={driverLocation}
          tripStatus={ride.status ?? "pending"}
          height="100%" />
        }
        <div className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none" style={{ background: 'linear-gradient(to bottom, hsl(217 85% 29% / 0.12), transparent)' }} />
      </div>

      {/* Glass header */}
      <div className="absolute top-0 left-0 right-0 z-40 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <div className="flex items-center justify-between">
          <button onClick={() => nav("/ride")} className="w-11 h-11 flex items-center justify-center rounded-full glass-btn active:scale-95 transition-all glass-glow-blue">
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <div className="glass-card-heavy rounded-full px-4 py-2">
            <p className="text-xs font-bold text-foreground">
              {ride.status ?? "Posted"} • <span className="text-primary">{driversViewing} viewing</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 z-50 glass-card-heavy max-h-[82vh] overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <div className="sticky top-0 pt-3.5 pb-2.5 z-10" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, background: 'var(--gradient-primary)' }}>
          <div className="w-10 h-1 rounded-full bg-primary-foreground/40 mx-auto" />
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Ride info */}
          <div className="glass-card rounded-2xl p-4 glass-glow-blue">
            <div className="space-y-1 mb-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Pickup:</span> {ride.pickup_address ?? "My location"}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Drop-off:</span> {ride.dropoff_address ?? "—"}
              </p>
            </div>
            
            {ride.status === "completed" && <SettlementInfo tripId={ride.id} />}

            {ride.driver_id && ride.pickup_lat != null && ride.dropoff_lat != null &&
            <NavigationCard
              tripId={ride.id} status={ride.status ?? 'accepted'}
              pickupLat={ride.pickup_lat} pickupLng={ride.pickup_lon!}
              dropoffLat={ride.dropoff_lat} dropoffLng={ride.dropoff_lon!}
              pickupAddress={ride.pickup_address ?? undefined}
              dropoffAddress={ride.dropoff_address ?? undefined} />
            }

            {!accepted ?
            <button onClick={() => setShowOffersModal(true)}
            className="w-full mt-4 py-4 rounded-2xl bg-accent text-accent-foreground font-black text-lg active:scale-[0.97] transition-all shadow-[0_4px_20px_hsl(45_100%_51%/0.3)]">
                View Offers ({premiumOffers.filter((o) => o.expiresAt > Date.now()).length})
              </button> :

            <div className="mt-4 space-y-3">
                <p className="text-sm text-primary font-semibold">Driver accepted </p>
                <div className="grid grid-cols-3 gap-2">
                  <VoiceCallButton onCall={startCall} disabled={callStatus !== "idle"} label="Data" className="w-full text-xs" />
                  <a href="tel:+263" className="flex items-center justify-center gap-1 py-3 rounded-2xl font-medium text-xs text-center active:scale-95 transition-all" style={{ background: 'var(--gradient-primary)' }}>
                    <Phone className="h-3.5 w-3.5 text-primary-foreground shrink-0" />
                    <span className="text-primary-foreground">Phone</span>
                  </a>
                  <button onClick={() => document.getElementById("voyex-chat")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center justify-center gap-1 py-3 rounded-2xl glass-card font-medium text-xs active:scale-95 transition-all">
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" /> Chat
                  </button>
                </div>
              </div>
            }
          </div>

          {/* Chat */}
          {accepted &&
          <div id="voyex-chat" className="glass-card rounded-2xl p-4">
              <h3 className="font-bold text-lg mb-3 text-foreground">Chat</h3>
              <div className="h-48 overflow-y-auto space-y-2 mb-3 bg-foreground/[0.02] rounded-xl p-3">
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
              className="flex-1 px-4 py-3 rounded-2xl glass-card outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                <button onClick={sendMessage} disabled={!msgText.trim()}
              className="px-4 py-3 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-50 active:scale-95 transition-all">
                  Send
                </button>
              </div>
            </div>
          }
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
      {toast




      }
    </div>);

}