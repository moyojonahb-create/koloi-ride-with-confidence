import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { clampTo5 } from "@/lib/koloiMoney";
import { joinRidePresence, countDriversViewing } from "@/lib/koloiRealtime";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const accepted = useMemo(() => !!ride?.driver_id, [ride]);

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
      const { data: r, error: rErr } = await supabase
        .from("rides")
        .select("*")
        .eq("id", rideId)
        .single();
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
    } catch (e: any) {
      setToast(e?.message || "Failed to load ride.");
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
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `ride_id=eq.${rideId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: `id=eq.${rideId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [rideId]);

  // Presence: count drivers viewing
  useEffect(() => {
    if (!rideId) return;

    let pres: any;
    (async () => {
      pres = await joinRidePresence(rideId, { role: "rider", name: "rider" });
      pres.on("presence", { event: "sync" }, () => {
        const state = pres.presenceState() as Record<string, any[]>;
        setDriversViewing(countDriversViewing(state));
      });
    })();

    return () => {
      if (pres) supabase.removeChannel(pres);
    };
  }, [rideId]);

  // Init map
  useEffect(() => {
    if (!ride) return;
    if (mapRef.current) return;

    const map = L.map("koloi-ride-map", { zoomControl: true }).setView([-20.94, 29.01], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    const layer = L.layerGroup().addTo(map);

    mapRef.current = map;
    layerRef.current = layer;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [ride]);

  // Draw pickup/dropoff + route
  useEffect(() => {
    if (!ride || !mapRef.current || !layerRef.current) return;
    const map = mapRef.current;
    const layer = layerRef.current;
    layer.clearLayers();

    const pickupHas = typeof ride.pickup_lat === "number" && typeof ride.pickup_lon === "number";
    const dropHas = typeof ride.dropoff_lat === "number" && typeof ride.dropoff_lon === "number";

    if (!pickupHas && !dropHas) return;

    const pts: [number, number][] = [];

    if (pickupHas) {
      const p: [number, number] = [ride.pickup_lat as number, ride.pickup_lon as number];
      pts.push(p);
      L.circleMarker(p, { radius: 10, weight: 2, color: "#F7C600", fillColor: "#F7C600", fillOpacity: 0.8 })
        .bindTooltip("Pickup", { permanent: true, direction: "bottom" })
        .addTo(layer);
    }

    if (pickupHas && dropHas) {
      const a: [number, number] = [ride.pickup_lat as number, ride.pickup_lon as number];
      const b: [number, number] = [ride.dropoff_lat as number, ride.dropoff_lon as number];
      L.polyline([a, b], { weight: 5, color: "#0F2A44" }).addTo(layer);
    }

    if (dropHas) {
      const d: [number, number] = [ride.dropoff_lat as number, ride.dropoff_lon as number];
      pts.push(d);
      L.circleMarker(d, { radius: 10, weight: 2, color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.8 })
        .bindTooltip("Drop-off", { permanent: true, direction: "bottom" })
        .addTo(layer);
    }

    if (pts.length === 1) map.setView(pts[0], 16);
    else map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });
  }, [ride]);

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
    } catch (e: any) {
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
    } catch (e: any) {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
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

      {/* Map */}
      <div className="w-full h-[45vh] min-h-[260px] max-h-[420px] relative">
        <div id="koloi-ride-map" className="w-full h-full" />
      </div>

      {/* Ride info card */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="space-y-1 mb-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Pickup:</span> {ride.pickup_address ?? "My location"}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Drop-off:</span> {ride.dropoff_address ?? "—"}
            </p>
          </div>

          <div className="text-3xl font-black text-primary">
            R{clampTo5(Number(ride.fare ?? 35))}
          </div>

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
                <a
                  href="tel:+263"
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-center"
                >
                  📞 Call Driver
                </a>
                <button
                  onClick={() => document.getElementById("koloi-chat")?.scrollIntoView({ behavior: "smooth" })}
                  className="flex-1 py-3 rounded-xl border border-border bg-background font-bold"
                >
                  💬 Message
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
