import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceCallButtonProps {
  onCall: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export default function VoiceCallButton({
  onCall,
  disabled,
  label = "Voice Call",
  className = "",
}: VoiceCallButtonProps) {
  return (
    <Button
      onClick={onCall}
      disabled={disabled}
      className={`gap-2 bg-green-600 hover:bg-green-700 text-white ${className}`}
    >
      <Phone className="h-4 w-4" />
      {label}
    </Button>
  );
}
