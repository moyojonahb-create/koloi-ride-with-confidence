import React, { useEffect, useMemo, useRef, useState } from "react";

export type DriverViewing = {
  driverId: string;
  name: string;
  phone: string;
  vehicleType: "Car" | "Taxi" | "Motorbike";
  plateNumber: string;
  languages: string[];
  distanceKm: number;
  etaMinutes: number;
};

export type DriverOffer = DriverViewing & {
  offerId: string;
  offeredFareR: number;
  createdAt: string;
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

const ACCEPT_WINDOW_SECONDS = 10;

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
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

  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => setNow(Date.now()), 250);
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
  }, [offers, isOpen]);

  const offersWithCountdown = useMemo(() => {
    return offers.map((o) => {
      const deadline = deadlinesRef.current[o.offerId] ?? Date.now() + ACCEPT_WINDOW_SECONDS * 1000;
      const msLeft = deadline - now;
      const secondsLeft = Math.max(0, Math.ceil(msLeft / 1000));
      const expired = msLeft <= 0;
      return { ...o, secondsLeft, expired };
    });
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
    <div className="fixed inset-0 bg-black/45 flex justify-center items-end z-[9999] p-3" role="dialog" aria-modal="true" aria-label="Nearby drivers">
      <div className="w-full max-w-[520px] bg-background rounded-2xl p-4 shadow-2xl max-h-[88vh] overflow-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-black text-foreground">Nearby drivers</div>
            <div className="text-xs text-muted-foreground mt-0.5">Trip: {tripId}</div>
          </div>
          <button onClick={onClose} className="border-none bg-transparent text-lg cursor-pointer hover:opacity-70" aria-label="Close">✕</button>
        </div>

        <section className="mt-3">
          <div className="font-black text-foreground mb-2 mt-1.5">Viewing request</div>
          {viewing.length === 0 ? (
            <div className="p-3 bg-muted rounded-xl text-muted-foreground">No drivers viewing yet…</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {viewing.map((d) => (
                <div key={d.driverId} className="border border-border rounded-xl p-3">
                  <div className="flex justify-between items-baseline gap-2.5">
                    <div className="font-black text-foreground">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.etaMinutes} min • {d.distanceKm.toFixed(1)} km</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.vehicleType} • {d.plateNumber} • {d.languages.join(", ")}
                  </div>
                  <a className="inline-block mt-2 font-extrabold text-primary no-underline hover:underline" href={`tel:${normalizePhone(d.phone)}`}>Call {d.phone}</a>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-3.5">
          <div className="font-black text-foreground mb-2 mt-1.5">Offers received</div>
          {offersWithCountdown.length === 0 ? (
            <div className="p-3 bg-muted rounded-xl text-muted-foreground">Waiting for offers…</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {offersWithCountdown.map((o) => (
                <div key={o.offerId} className="border border-border rounded-xl p-3">
                  <div className="flex justify-between items-baseline gap-2.5">
                    <div className="font-black text-foreground">{o.name}</div>
                    <div className="font-black text-foreground">R {o.offeredFareR.toFixed(2)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.vehicleType} • {o.plateNumber} • {o.languages.join(", ")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5">
                    {o.etaMinutes} min away • {o.distanceKm.toFixed(1)} km
                  </div>
                  <div className="mt-2.5 flex justify-between items-center gap-2.5">
                    <div className="text-xs font-extrabold text-foreground">
                      {o.expired ? "Expired" : `Accept in ${o.secondsLeft}s`}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(o.offerId, o.expired)}
                        disabled={o.expired || busyOfferId !== null}
                        className="border-none rounded-xl px-3 py-2.5 font-black cursor-pointer bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(o.offerId)}
                        disabled={busyOfferId !== null}
                        className="border-none rounded-xl px-3 py-2.5 font-black cursor-pointer bg-secondary text-secondary-foreground disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <a className="inline-block font-extrabold text-primary no-underline hover:underline" href={`tel:${normalizePhone(o.phone)}`}>Call {o.phone}</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="mt-3.5">
          <button
            onClick={handleCancelRide}
            disabled={busyCancel}
            className="w-full border-none rounded-xl px-3 py-2.5 font-black cursor-pointer bg-destructive text-destructive-foreground disabled:opacity-50"
          >
            {busyCancel ? "Cancelling…" : "Cancel ride"}
          </button>
        </div>
      </div>
    </div>
  );
}
