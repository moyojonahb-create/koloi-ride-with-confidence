import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

interface CancellationPolicyProps {
  rideId: string;
  rideStatus: string;
  onCancelled: () => void;
}

export default function CancellationPolicy({ rideId, rideStatus, onCancelled }: CancellationPolicyProps) {
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!user || cancelling) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("rides")
        .update({ status: "cancelled" })
        .eq("id", rideId);

      if (error) throw error;

      toast.info("Ride cancelled");
      onCancelled();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast.error("Failed to cancel", { description: message });
    } finally {
      setCancelling(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="border-2 border-destructive rounded-xl p-4 bg-destructive/5 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-foreground">Cancel this ride?</p>
            <p className="text-sm text-muted-foreground mt-1">Are you sure you want to cancel?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "Cancelling…" : "Yes, Cancel"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
            Keep Ride
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
      onClick={() => setShowConfirm(true)}
    >
      <X className="h-4 w-4 mr-2" />
      Cancel Ride
    </Button>
  );
}
