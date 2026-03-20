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
      className={`gap-2 bg-primary hover:bg-primary/90 text-primary-foreground ${className}`}
    >
      <Phone className="h-4 w-4" />
      {label}
    </Button>
  );
}
