import { useState } from "react";
import { Wallet, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { payRideFromWallet } from "@/lib/walletPayments";
import { useWalletPin } from "@/hooks/useWalletPin";
import WalletPinModal from "@/components/wallet/WalletPinModal";

interface PayRideButtonProps {
  rideId: string;
  fare: number;
  walletPaid: boolean;
  onPaid?: () => void;
  className?: string;
}

export default function PayRideButton({ rideId, fare, walletPaid, onPaid, className }: PayRideButtonProps) {
  const [loading, setLoading] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const { hasPin, verifyPin, setPin } = useWalletPin();

  if (walletPaid) {
    return (
      <div className={`flex items-center justify-center gap-2 p-3 rounded-2xl bg-primary/10 text-primary font-semibold ${className || ""}`}>
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm">Wallet paid · ${fare.toFixed(2)}</span>
      </div>
    );
  }

  const doPay = async () => {
    setLoading(true);
    try {
      const res = await payRideFromWallet(rideId);
      if (res?.ok) {
        toast.success(`Paid $${fare.toFixed(2)} from wallet`);
        onPaid?.();
      } else {
        toast.error(res?.reason || "Payment failed");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setPinOpen(true)}
        disabled={loading}
        className={`w-full h-12 rounded-2xl font-semibold ${className || ""}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Wallet className="h-4 w-4 mr-2" />
            Pay Ride · ${fare.toFixed(2)}
          </>
        )}
      </Button>

      <WalletPinModal
        isOpen={pinOpen}
        onClose={() => setPinOpen(false)}
        onVerified={() => { setPinOpen(false); doPay(); }}
        mode={hasPin ? "verify" : "setup"}
        onVerifyPin={verifyPin}
        onSetPin={setPin}
      />
    </>
  );
}
