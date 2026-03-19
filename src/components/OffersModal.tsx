import React, { useEffect, useMemo, useRef, useState } from "react";
import { playNewRequestSound } from "@/lib/notificationSounds";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Star, CarFront, Clock3, PhoneCall } from "lucide-react";

export type DriverViewing = {
  driverId: string;
  name: string;
  phone: string;
  vehicleType: "Car" | "Taxi" | "Motorbike";
  plateNumber: string;
  vehicleColor?: string;
  languages: string[];
  distanceKm: number;
  etaMinutes: number;
};

export type DriverOffer = DriverViewing & {
  offerId: string;
  offeredFareR: number;
  createdAt: string;
  driverName?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  gender?: string | null;
  avatarUrl?: string | null;
  ratingAvg?: number | null;
  totalTrips?: number | null;
};

type Props = {
  isOpen: boolean;
  tripId: string;
  viewing: DriverViewing[];
  offers: DriverOffer[];
  onAcceptOffer: (offerId: string) => Promise<void> | void;
  onDeclineOffer: (offerId: string) => Promise<void> | void;
  onCancelRide: () => Promise<void> | void;
  onClose: () => void;
};

const ACCEPT_WINDOW_SECONDS = 180;

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function ExpiryProgressBar({
  secondsLeft,
  totalSeconds = ACCEPT_WINDOW_SECONDS,
}: {
  secondsLeft: number;
  totalSeconds?: number;
}) {
  const progress = Math.max(0, (secondsLeft / totalSeconds) * 100);

  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
      <div
        className="h-full bg-primary rounded-full transition-all duration-200 ease-linear"
        style={{ width: `${progress}%`, transition: "width 0.2s linear" }}
      />
    </div>
  );
}

export default function OffersModal({
  isOpen,
  tripId,
  viewing,
  offers,
  onAcceptOffer,
  onDeclineOffer,
  onCancelRide,
  onClose,
}: Props) {
  const deadlinesRef = useRef<Record<string, number>>({});
  const [now, setNow] = useState<number>(Date.now());
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [busyCancel, setBusyCancel] = useState(false);
  const prevOffersCount = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    for (const o of offers) {
      if (!deadlinesRef.current[o.offerId]) {
        const created = new Date(o.createdAt).getTime();
        deadlinesRef.current[o.offerId] = created + ACCEPT_WINDOW_SECONDS * 1000;
      }
    }

    if (offers.length > prevOffersCount.current && prevOffersCount.current > 0) {
      playNewRequestSound();
    }
    prevOffersCount.current = offers.length;
  }, [offers, isOpen]);

  const offersWithCountdown = useMemo(() => {
    return offers
      .map((o) => {
        const deadline =
          deadlinesRef.current[o.offerId] ?? Date.now() + ACCEPT_WINDOW_SECONDS * 1000;
        const msLeft = deadline - now;
        const secondsLeft = Math.max(0, Math.ceil(msLeft / 1000));
        const expired = msLeft <= 0;
        return { ...o, secondsLeft, expired };
      })
      .filter((o) => !o.expired);
  }, [offers, now]);

  const handleAccept = async (offerId: string, expired: boolean) => {
    if (expired || busyOfferId) return;
    try {
      setBusyOfferId(offerId);
      await onAcceptOffer(offerId);
      onClose();
    } finally {
      setBusyOfferId(null);
    }
  };

  const handleDecline = async (offerId: string) => {
    if (busyOfferId) return;
    try {
      setBusyOfferId(offerId);
      await onDeclineOffer(offerId);
    } finally {
      setBusyOfferId(null);
    }
  };

  const handleCancelRide = async () => {
    if (busyCancel) return;
    try {
      setBusyCancel(true);
      await onCancelRide();
      onClose();
    } finally {
      setBusyCancel(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-end z-[9999] p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Nearby drivers"
    >
      <div className="w-full max-w-[520px] rounded-[28px] border border-white/35 bg-white/35 backdrop-blur-2xl p-4 shadow-[0_22px_60px_rgba(0,0,0,0.28)] max-h-[88vh] overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-black text-foreground">Matching Drivers</div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
              {offersWithCountdown.length} live offer{offersWithCountdown.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="border-none bg-muted hover:bg-muted/80 rounded-full p-2 text-lg cursor-pointer transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <section className="mt-4">
          <div className="font-bold text-foreground mb-2 text-sm">Drivers nearby</div>
          {viewing.length === 0 ? (
            <div className="p-3 bg-muted/50 rounded-xl text-muted-foreground text-sm">
              Waiting for drivers to view your request…
            </div>
          ) : (
            <div className="relative pt-1 pb-2">
              {viewing.slice(0, 3).map((d, i) => (
                <div
                  key={d.driverId}
                  className="rounded-2xl border border-white/45 bg-white/75 backdrop-blur-lg p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                  style={{
                    marginTop: i === 0 ? 0 : -10,
                    marginLeft: i * 6,
                    marginRight: i * 6,
                    zIndex: 20 - i,
                    position: "relative",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.vehicleType} • {d.plateNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">ETA</p>
                      <p className="text-sm font-bold text-primary">~{d.etaMinutes}m</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-4">
          <div className="font-bold text-foreground mb-2 text-sm">Choose a driver</div>
          {offersWithCountdown.length === 0 ? (
            <div className="p-4 bg-muted/50 rounded-xl text-muted-foreground text-sm text-center">
              <div className="animate-pulse">Waiting for driver offers…</div>
              <p className="text-xs mt-1">Offers appear here when drivers bid on your ride</p>
            </div>
          ) : (
            <div className="flex flex-col pt-1 pb-2">
              {offersWithCountdown.map((o, i) => (
                <div
                  key={o.offerId}
                  className="rounded-3xl border border-white/45 bg-white/80 backdrop-blur-xl p-4 shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
                  style={{
                    marginTop: i === 0 ? 0 : -8,
                    marginLeft: i * 4,
                    marginRight: i * 4,
                    zIndex: 40 - i,
                    position: "relative",
                  }}
                >
                  <div className="flex justify-between items-start gap-3 mb-3.5">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar className="h-14 w-14 border-2 border-white/70 shadow-sm shrink-0">
                        {o.avatarUrl ? <AvatarImage src={o.avatarUrl} alt={o.driverName || "Driver"} /> : null}
                        <AvatarFallback
                          className={`text-sm font-bold ${
                            o.gender === "female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {o.gender === "female" ? "♀" : "♂"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-foreground text-[16px] leading-tight truncate">
                          {o.driverName || o.name || "Driver"}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {o.vehicleMake && o.vehicleModel
                            ? `${o.vehicleMake} ${o.vehicleModel}`
                            : o.vehicleModel || o.vehicleType}
                          {o.vehicleColor ? ` • ${o.vehicleColor}` : ""}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5 truncate">
                          Plate: <span className="font-semibold text-foreground">{o.plateNumber}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {o.ratingAvg != null && o.ratingAvg > 0 ? (
                            <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {Number(o.ratingAvg).toFixed(1)}
                            </span>
                          ) : null}
                          <span className="text-xs text-muted-foreground font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                            {o.totalTrips || 0} trips
                          </span>
                          <span className="text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" /> {o.etaMinutes} min
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 bg-primary/5 rounded-2xl px-3 py-2 min-w-[92px]">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                        Fare
                      </p>
                      <div className="font-black text-2xl text-primary leading-none">${o.offeredFareR.toFixed(2)}</div>
                      <div className="mt-1 text-[11px] font-medium text-muted-foreground">Total offer</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-xl bg-primary/5 px-3 py-2 border border-primary/10">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Car</p>
                      <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                        <CarFront className="h-3.5 w-3.5 text-primary" />
                        {o.vehicleMake && o.vehicleModel ? `${o.vehicleMake} ${o.vehicleModel}` : o.vehicleType}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50/80 px-3 py-2 border border-amber-200/60">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Arrives in</p>
                      <p className="text-xs font-semibold text-amber-700 inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" /> {o.etaMinutes} min
                      </p>
                    </div>
                  </div>

                  {o.phone && o.phone !== "+263" ? (
                    <div className="mb-3 p-2.5 bg-muted/70 rounded-xl">
                      <a
                        className="font-semibold text-primary no-underline hover:underline flex items-center gap-2"
                        href={`tel:${normalizePhone(o.phone)}`}
                      >
                        <PhoneCall className="h-4 w-4" /> {o.phone}
                      </a>
                    </div>
                  ) : null}

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Offer expires in</span>
                      <span className="font-bold text-primary">{o.secondsLeft}s</span>
                    </div>
                    <ExpiryProgressBar secondsLeft={o.secondsLeft} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleAccept(o.offerId, o.expired)}
                      disabled={o.expired || busyOfferId !== null}
                      className="w-full border-none rounded-2xl px-4 py-3.5 font-semibold cursor-pointer bg-gradient-to-r from-[hsl(217_85%_29%)] to-sky-500 text-white disabled:opacity-50 transition-all hover:opacity-90 shadow-[0_8px_20px_rgba(37,99,235,0.35)]"
                    >
                      {busyOfferId === o.offerId ? "Accepting..." : "Accept Driver"}
                    </button>
                    <button
                      onClick={() => handleDecline(o.offerId)}
                      disabled={busyOfferId !== null}
                      className="w-full border-none bg-transparent rounded-xl px-4 py-2.5 text-sm font-medium cursor-pointer text-muted-foreground disabled:opacity-50 transition-colors hover:text-foreground hover:bg-muted/60"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-4">
          <button
            onClick={handleCancelRide}
            disabled={busyCancel}
            className="w-full border-2 border-destructive rounded-xl px-4 py-3 font-bold cursor-pointer bg-transparent text-destructive disabled:opacity-50 transition-all hover:bg-destructive hover:text-destructive-foreground"
          >
            {busyCancel ? "Cancelling…" : "Cancel Ride"}
          </button>
        </div>

        <div className="mt-3 text-xs text-center text-muted-foreground">
          Offers are valid for 3 minutes. Expired offers disappear automatically.
        </div>
      </div>
    </div>
  );
}
