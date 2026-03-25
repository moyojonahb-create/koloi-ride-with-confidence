import React from "react";
import { MapPin, User, Navigation, MessageSquare } from "lucide-react";

interface RideUIProps {
  pickupText: string;
  dropoffText: string;
  canRequest: boolean;
  onBack: () => void;
  onProfile: () => void;
  onCenter: () => void;
  onNavigate: () => void;
  onPickupClick: () => void;
  onDropoffClick: () => void;
  onRequest: () => void;
  mapSlot: React.ReactNode;
}

export default function RideUI({
  pickupText,
  dropoffText,
  canRequest,
  onBack,
  onProfile,
  onCenter,
  onNavigate,
  onPickupClick,
  onDropoffClick,
  onRequest,
  mapSlot,
}: RideUIProps) {
  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-secondary">
      {/* Map Container */}
      <div className="absolute inset-0 z-0">{mapSlot}</div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-foreground/20 to-transparent">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-card/90 hover:bg-card transition"
        >
          ←
        </button>
        <button
          onClick={onProfile}
          className="p-2 rounded-full bg-card/90 hover:bg-card transition"
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      {/* Location Input Card - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
        <div className="max-w-md mx-auto bg-card rounded-3xl shadow-2xl overflow-hidden">
          {/* Pickup */}
          <button
            onClick={onPickupClick}
            className="w-full flex items-center gap-3 p-4 border-b border-border hover:bg-secondary transition"
          >
            <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-left flex-1">
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium text-foreground">{pickupText}</p>
            </div>
          </button>

          {/* Dropoff */}
          <button
            onClick={onDropoffClick}
            className="w-full flex items-center gap-3 p-4 border-b border-border hover:bg-secondary transition"
          >
            <MapPin className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="text-left flex-1">
              <p className="text-xs text-muted-foreground">Dropoff</p>
              <p className="text-sm font-medium text-foreground">{dropoffText}</p>
            </div>
          </button>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 p-4 bg-secondary">
            <button
              onClick={onCenter}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-card transition"
            >
              <Navigation className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Center</span>
            </button>
            <button
              onClick={onNavigate}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-card transition"
            >
              <Navigation className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Navigate</span>
            </button>
            <button
              onClick={() => {}}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-card transition"
            >
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Chat</span>
            </button>
          </div>

          {/* Request Button */}
          <button
            onClick={onRequest}
            disabled={!canRequest}
            className={`w-full py-3 font-semibold rounded-b-3xl transition ${
              canRequest
                ? "border border-white/30 bg-primary/20 backdrop-blur-xl text-primary hover:bg-primary/30 shadow-[0_4px_16px_hsl(var(--primary)/0.2)]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            Request Ride
          </button>
        </div>
      </div>
    </div>
  );
}
