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
    <div className="relative w-full h-[100dvh] overflow-hidden bg-gray-50">
      {/* Map Container */}
      <div className="absolute inset-0 z-0">{mapSlot}</div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/20 to-transparent">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-white/90 hover:bg-white transition"
        >
          ←
        </button>
        <button
          onClick={onProfile}
          className="p-2 rounded-full bg-white/90 hover:bg-white transition"
        >
          <User className="w-5 h-5" />
        </button>
      </div>

      {/* Location Input Card - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Pickup */}
          <button
            onClick={onPickupClick}
            className="w-full flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition"
          >
            <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-left flex-1">
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm font-medium">{pickupText}</p>
            </div>
          </button>

          {/* Dropoff */}
          <button
            onClick={onDropoffClick}
            className="w-full flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition"
          >
            <MapPin className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="text-left flex-1">
              <p className="text-xs text-gray-500">Dropoff</p>
              <p className="text-sm font-medium">{dropoffText}</p>
            </div>
          </button>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50">
            <button
              onClick={onCenter}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white transition"
            >
              <Navigation className="w-5 h-5 text-gray-700" />
              <span className="text-xs text-gray-600">Center</span>
            </button>
            <button
              onClick={onNavigate}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white transition"
            >
              <Navigation className="w-5 h-5 text-gray-700" />
              <span className="text-xs text-gray-600">Navigate</span>
            </button>
            <button
              onClick={() => {}}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white transition"
            >
              <MessageSquare className="w-5 h-5 text-gray-700" />
              <span className="text-xs text-gray-600">Chat</span>
            </button>
          </div>

          {/* Request Button */}
          <button
            onClick={onRequest}
            disabled={!canRequest}
            className={`w-full py-3 font-semibold rounded-b-3xl transition ${
              canRequest
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Request Ride
          </button>
        </div>
      </div>
    </div>
  );
}
