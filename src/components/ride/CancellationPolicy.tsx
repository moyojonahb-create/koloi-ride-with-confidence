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

const CANCELLATION_FEE = 5; // R5 fee if driver en route

export default function CancellationPolicy({ rideId, rideStatus, onCancelled }: CancellationPolicyProps) {
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const hasFee = ["accepted", "arrived", "in_progress"].includes(rideStatus);

  const handleCancel = async () => {
    if (!user || cancelling) return;
    setCancelling(true);
    try {
      // Record cancellation fee if applicable
      if (hasFee) {
        await supabase.from("cancellation_fees" as any).insert({
          ride_id: rideId,
          user_id: user.id,
          amount: CANCELLATION_FEE,
          reason: `Cancelled during ${rideStatus} status`,
        });
      }

      const { error } = await supabase
        .from("rides")
        .update({ status: "cancelled" })
        .eq("id", rideId);

      if (error) throw error;

      toast.info(hasFee ? `Ride cancelled. R${CANCELLATION_FEE} fee applied.` : "Ride cancelled");
      onCancelled();
    } catch (e: any) {
      toast.error("Failed to cancel", { description: e.message });
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
            {hasFee ? (
              <p className="text-sm text-muted-foreground mt-1">
                A <span className="font-bold text-destructive">R{CANCELLATION_FEE}</span> cancellation fee will apply because the driver is already en route.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">No fee — cancel before a driver accepts.</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" className="flex-1" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "Cancelling…" : hasFee ? `Cancel (R${CANCELLATION_FEE} fee)` : "Yes, Cancel"}
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
      Cancel Ride {hasFee && `(R${CANCELLATION_FEE} fee)`}
    </Button>
  );
}
