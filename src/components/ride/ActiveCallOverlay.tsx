import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCallDuration, type CallStatus } from "@/hooks/useWebRTCCall";

interface ActiveCallOverlayProps {
  status: CallStatus;
  duration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
  otherUserName?: string;
}

export default function ActiveCallOverlay({
  status,
  duration,
  isMuted,
  isSpeaker,
  onToggleMute,
  onToggleSpeaker,
  onEndCall,
  otherUserName = "Call",
}: ActiveCallOverlayProps) {
  const statusText =
    status === "ringing"
      ? "Ringing…"
      : status === "connecting"
      ? "Connecting…"
      : status === "connected"
      ? formatCallDuration(duration)
      : status === "ended"
      ? "Call ended"
      : status === "error"
      ? "Call failed"
      : "";

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] bg-primary text-primary-foreground shadow-lg animate-in slide-in-from-top duration-300">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{otherUserName}</p>
          <p className="text-xs opacity-80">{statusText}</p>
        </div>

        <div className="flex items-center gap-2">
          {status === "connected" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/20"
                onClick={onToggleMute}
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/20"
                onClick={onToggleSpeaker}
              >
                {isSpeaker ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-destructive hover:bg-destructive/90 text-white"
            onClick={onEndCall}
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
