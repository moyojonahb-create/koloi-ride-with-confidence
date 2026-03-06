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
      const { data } = await supabase
        .from("platform_ledger")
        .select("status, created_at")
        .eq("trip_id", tripId)
        .maybeSingle();
      setSettlement(data);
    } catch (err: unknown) { console.warn("Settlement fetch failed:", err); }
    setSettling(false);
  };

  if (loading) return null;

  if (settlement) {
    return (
      <div className="mt-2 px-3 py-2 bg-primary/10 rounded-xl text-sm text-primary font-semibold space-y-1">
        <p>Trip completed</p>
        <p className="text-xs text-muted-foreground">Settled • {new Date(settlement.created_at).toLocaleString()}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleSettle}
      disabled={settling}
      className="mt-2 w-full py-2 rounded-xl border border-border bg-background text-sm font-bold hover:bg-secondary"
    >
      {settling ? "Settling..." : "Settle Now"}
    </button>
  );
}

type RideRow = {
  id: string;
  user_id: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  fare: number | null;
  status: string | null;
  pickup_lat?: number | null;
  pickup_lon?: number | null;
  dropoff_lat?: number | null;
  dropoff_lon?: number | null;
  driver_id?: string | null;
};

type OfferRow = {
  id: string;
  ride_id: string;
  driver_id: string;
  price: number;
  eta_minutes: number | null;
  message: string | null;
  status: string | null;
  created_at?: string | null;
};

type MessageRow = {
  id: string;
  ride_id: string;
  sender_id: string;
  text: string;
  created_at?: string | null;
};

function msLeftFromCreatedAt(created_at?: string | null, windowMs = 10_000) {
  if (!created_at) return 0;
  const t = new Date(created_at).getTime();
  const left = windowMs - (Date.now() - t);
  return Math.max(0, left);
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

  // Real-time driver tracking
  const driverUserId = ride?.driver_id ? undefined : undefined; // will be set after load
  // We need the driver's user_id for tracking - fetch it when ride has driver_id
  const [driverUserIdForTracking, setDriverUserIdForTracking] = useState<string | null>(null);

  useEffect(() => {
    if (!ride?.driver_id) {
      setDriverUserIdForTracking(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", ride.driver_id!)
        .maybeSingle();
      if (data) setDriverUserIdForTracking(data.user_id);
    })();
  }, [ride?.driver_id]);

  const driverLocation = useDriverTracking(driverUserIdForTracking, ride?.status ?? null);

  const accepted = useMemo(() => !!ride?.driver_id, [ride]);

  // Agora voice calling - driver is caller, rider is callee
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
    rideId: rideId ?? null,
    currentUserId: userId,
    otherUserId: ride?.user_id ?? null,
  });
  // Auth
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    })();
  }, []);

  // Load ride + offers + messages
  const load = async () => {
    if (!rideId) return;
    setLoading(true);
    try {
      const { data: r, error: rErr } = await supabase.from("rides").select("*").eq("id", rideId).single();
      if (rErr) throw new Error(rErr.message);
      setRide(r as RideRow);

      const { data: o, error: oErr } = await supabase
        .from("offers")
        .select("*")
        .eq("ride_id", rideId)
        .order("created_at", { ascending: false });
      if (oErr) throw new Error(oErr.message);
      setOffers((o as OfferRow[]) || []);

      const { data: m, error: mErr } = await supabase
        .from("messages")
        .select("*")
        .eq("ride_id", rideId)
        .order("created_at", { ascending: true });
      if (mErr) throw new Error(mErr.message);
      setMessages((m as MessageRow[]) || []);
    } catch (e: unknown) {
      setToast((e as Error)?.message || "Failed to load ride.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [rideId]);

  // Realtime subscriptions
  useEffect(() => {
    if (!rideId) return;

    const ch = supabase
      .channel(`db:ride:${rideId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `ride_id=eq.${rideId}` }, () =>
        load(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: `id=eq.${rideId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` }, () =>
        load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [rideId]);

  // Presence: count drivers viewing
  useEffect(() => {
    if (!rideId) return;

    let pres: unknown;
    (async () => {
      pres = await joinRidePresence(rideId, { role: "rider", name: "rider" });
      pres.on("presence", { event: "sync" }, () => {
        const state = pres.presenceState() as Record<string, unknown[]>;
        setDriversViewing(countDriversViewing(state));
      });
    })();

    return () => {
      if (pres) supabase.removeChannel(pres);
    };
  }, [rideId]);

  // (Map rendering handled by TripGoogleMap component)

  const canAcceptNow = (offer: OfferRow) => {
    const left = msLeftFromCreatedAt(offer.created_at, 10_000);
    return left > 0 && offer.status === "pending" && !accepted;
  };

  const acceptOffer = async (offer: OfferRow) => {
    if (!ride || !rideId) return;
    if (!canAcceptNow(offer)) {
      setToast("This offer expired (10 seconds). Ask driver to send again.");
      return;
    }

    setAcceptingOfferId(offer.id);

    try {
      // Get driver record ID
      const { data: driverData, error: driverErr } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", offer.driver_id)
        .maybeSingle();
      if (driverErr) throw new Error(driverErr.message);
      if (!driverData) throw new Error("Driver record not found");

      // Mark offer accepted
      await supabase.from("offers").update({ status: "accepted" }).eq("id", offer.id);

      // Reject other offers
      await supabase.from("offers").update({ status: "rejected" }).eq("ride_id", rideId).neq("id", offer.id);

      // Update ride with driver
      await supabase.from("rides").update({ driver_id: driverData.id, status: "accepted" }).eq("id", rideId);

      setToast("Driver accepted ✅ You can now call or message.");
      setShowOffersModal(false);
    } catch (e: unknown) {
      setToast(e?.message || "Failed to accept offer.");
    } finally {
      setAcceptingOfferId(null);
    }
  };

  const sendMessage = async () => {
    if (!rideId || !msgText.trim()) return;
    try {
      const { error } = await supabase.from("messages").insert({
        ride_id: rideId,
        sender_id: userId,
        text: msgText.trim(),
      });
      if (error) throw new Error(error.message);
      setMsgText("");
    } catch (e: unknown) {
      setToast(e?.message || "Message failed.");
    }
  };

  const OfferTimer = ({ offer }: { offer: OfferRow }) => {
    const [leftMs, setLeftMs] = useState(msLeftFromCreatedAt(offer.created_at, 10_000));

    useEffect(() => {
      const t = setInterval(() => setLeftMs(msLeftFromCreatedAt(offer.created_at, 10_000)), 200);
      return () => clearInterval(t);
    }, [offer.created_at]);

    const sec = Math.ceil(leftMs / 1000);
    return (
      <span className={`text-sm font-bold ${sec > 0 ? "text-primary" : "text-muted-foreground"}`}>
        {sec > 0 ? `Accept in ${sec}s` : "Expired"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-background p-4">
        <p className="text-center text-muted-foreground mb-4">Ride not found</p>
        <button
          onClick={() => nav("/ride")}
          className="w-full py-3 rounded-xl border border-border bg-background font-bold"
        >
          Back
        </button>
      </div>
    );
  }

  const pendingOffers = offers.filter((o) => o.status === "pending");

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
      {/* Header */}
      <div className="shrink-0 bg-background/95 backdrop-blur border-b border-border px-4 py-3 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-black text-lg text-foreground">Ride</h1>
            <p className="text-xs text-muted-foreground">
              Status: {ride.status ?? "Posted"} • Drivers viewing: {driversViewing}
            </p>
          </div>
          <button
            onClick={() => nav("/ride")}
            className="px-3 py-2 rounded-xl border border-border bg-background font-bold text-sm"
          >
            Back
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
      {/* Map */}
      {ride.pickup_lat != null && ride.dropoff_lat != null && (
        <TripGoogleMap
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lon! }}
          dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lon! }}
          driverLocation={driverLocation}
          tripStatus={ride.status ?? "pending"}
          height="40vh"
        />
      )}

      {/* Ride info card */}
      <div className="max-w-lg mx-auto p-4 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="space-y-1 mb-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Pickup:</span> {ride.pickup_address ?? "My location"}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Drop-off:</span> {ride.dropoff_address ?? "—"}
            </p>
          </div>

          <div className="text-3xl font-black text-primary">R{clampTo5(Number(ride.fare ?? 35))}</div>

          {ride.status === "completed" && <SettlementInfo tripId={ride.id} />}

          {/* External Maps Navigation */}
          {ride.driver_id && ride.pickup_lat != null && ride.dropoff_lat != null && (
            <NavigationCard
              tripId={ride.id}
              status={ride.status ?? 'accepted'}
              pickupLat={ride.pickup_lat}
              pickupLng={ride.pickup_lon!}
              dropoffLat={ride.dropoff_lat}
              dropoffLng={ride.dropoff_lon!}
              pickupAddress={ride.pickup_address ?? undefined}
              dropoffAddress={ride.dropoff_address ?? undefined}
            />
          )}

          {!accepted ? (
            <button
              onClick={() => setShowOffersModal(true)}
              className="w-full mt-4 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg"
            >
              View Offers ({pendingOffers.length})
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-primary font-semibold">Driver accepted ✅ Communication unlocked</p>
              <div className="flex gap-2">
                <VoiceCallButton
                  onCall={startCall}
                  disabled={callStatus !== "idle"}
                  label="Voice Call"
                  className="flex-1"
                />
                <a
                  href="tel:+263"
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-center text-sm"
                >
                  📞 Phone
                </a>
                <button
                  onClick={() => document.getElementById("koloi-chat")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex-1 py-3 rounded-xl border border-border bg-background font-bold text-sm"
                >
                  💬 Chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chat section */}
        {accepted && (
          <div id="koloi-chat" className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-bold text-lg mb-3 text-foreground">Chat</h3>

            <div className="h-48 overflow-y-auto space-y-2 mb-3 bg-muted/30 rounded-xl p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 ${
                        m.sender_id === userId
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border"
                      }`}
                    >
                      <p className="text-sm">{m.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message…"
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={sendMessage}
                disabled={!msgText.trim()}
                className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Offers Modal */}
      {showOffersModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={() => setShowOffersModal(false)}
        >
          <div
            className="bg-background w-full max-w-lg rounded-t-3xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-black text-lg">Driver Offers</h2>
                <p className="text-xs text-muted-foreground">Drivers viewing: {driversViewing}</p>
              </div>
              <button
                onClick={() => setShowOffersModal(false)}
                className="px-3 py-2 rounded-xl border border-border bg-background font-bold text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              {pendingOffers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No offers yet. Drivers will appear here when they bid.
                </p>
              ) : (
                pendingOffers.map((o) => (
                  <div key={o.id} className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-black text-primary">R{clampTo5(Number(o.price))}</span>
                      <OfferTimer offer={o} />
                    </div>

                    <div className="text-sm text-muted-foreground mb-3">
                      <p>ETA: {o.eta_minutes ?? 5} min</p>
                      {o.message && <p className="italic">"{o.message}"</p>}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptOffer(o)}
                        disabled={!canAcceptNow(o) || acceptingOfferId === o.id}
                        className={`flex-1 py-3 rounded-xl font-bold ${
                          canAcceptNow(o)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                        }`}
                      >
                        {acceptingOfferId === o.id ? "Accepting..." : "Accept"}
                      </button>
                      <button
                        onClick={() => supabase.from("offers").update({ status: "rejected" }).eq("id", o.id)}
                        className="flex-1 py-3 rounded-xl border border-border bg-background font-bold"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center p-4 border-t border-border">
              Accept is available for 10 seconds. If it expires, driver must send a new offer.
            </p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto bg-foreground text-background px-4 py-3 rounded-xl text-sm font-medium text-center cursor-pointer z-50"
          onClick={() => setToast(null)}
        >
          {toast} (tap to close)
        </div>
      )}
    </div>
  );
}
