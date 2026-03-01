import { useEffect, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

interface IncomingCallModalProps {
  callerId: string;
  onAnswer: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  callerId,
  onAnswer,
  onDecline,
}: IncomingCallModalProps) {
  const [callerName, setCallerName] = useState("Incoming Call");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", callerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setCallerName(data.full_name);
      });
  }, [callerId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-3xl p-8 mx-4 max-w-sm w-full text-center space-y-6 border border-border shadow-2xl">
        {/* Pulsing avatar */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-10 w-10 text-primary animate-pulse" />
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Incoming Voice Call</p>
          <h2 className="text-xl font-black text-foreground mt-1">
            {callerName}
          </h2>
        </div>

        <div className="flex items-center justify-center gap-8">
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16"
            onClick={onDecline}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            size="lg"
            className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700 text-white"
            onClick={onAnswer}
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
