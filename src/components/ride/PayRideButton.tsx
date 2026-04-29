import { useState } from "react";
import { Wallet, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { payRideFromWallet } from "@/lib/walletPayments";

interface PayRideButtonProps {
  rideId: string;
  fare: number;
  walletPaid: boolean;
  onPaid?: () => void;
  className?: string;
}

export default function PayRideButton({ rideId, fare, walletPaid, onPaid, className }: PayRideButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (walletPaid) {
    return (
      <div className={`flex items-center justify-center gap-2 p-3 rounded-2xl bg-primary/10 text-primary font-semibold ${className || ""}`}>
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm">Wallet paid · ${fare.toFixed(2)}</span>
      </div>
    );
  }

  const handlePay = async () => {
    if (!confirm) { setConfirm(true); return; }
    setLoading(true);
    try {
      const res = await payRideFromWallet(rideId);
      if (res?.ok) {
        toast.success(`Paid $${fare.toFixed(2)} from wallet`);
        onPaid?.();
      } else {
        toast.error(res?.reason || "Payment failed");
        setConfirm(false);
      }
    } catch (e) {
      toast.error((e as Error).message);
      setConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePay}
      disabled={loading}
      className={`w-full h-12 rounded-2xl font-semibold ${className || ""}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Wallet className="h-4 w-4 mr-2" />
          {confirm ? `Confirm pay $${fare.toFixed(2)}` : `Pay Ride · $${fare.toFixed(2)}`}
        </>
      )}
    </Button>
  );
}
