import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Lock, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EcoCashPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  driverName: string;
  driverEcoCash?: string | null;
  walletPin: string | null;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onPaymentComplete: () => void;
}

export default function EcoCashPaymentModal({
  isOpen, onClose, amount, currency, driverName, driverEcoCash, walletPin, onVerifyPin, onPaymentComplete
}: EcoCashPaymentModalProps) {
  const [step, setStep] = useState<'confirm' | 'pin' | 'processing' | 'done'>('confirm');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 5) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      if (newPin.length === 5) {
        verifyAndPay(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const verifyAndPay = async (enteredPin: string) => {
    setLoading(true);
    const ok = await onVerifyPin(enteredPin);
    if (!ok) {
      setError('Incorrect PIN');
      setPin('');
      setLoading(false);
      return;
    }

    // Simulate EcoCash payment processing
    setStep('processing');
    await new Promise(r => setTimeout(r, 2500));
    setStep('done');
    setLoading(false);
    toast.success('Payment sent successfully!');
    setTimeout(() => {
      onPaymentComplete();
      onClose();
      resetState();
    }, 1500);
  };

  const resetState = () => {
    setStep('confirm');
    setPin('');
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    if (step !== 'processing') {
      onClose();
      resetState();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
            EcoCash Payment
          </DialogTitle>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4 py-2">
            <div className="bg-accent/50 rounded-2xl p-4 text-center space-y-1">
              <p className="text-sm text-muted-foreground">Paying</p>
              <p className="text-3xl font-black text-foreground">{currency}{amount}</p>
              <p className="text-sm text-muted-foreground">to <span className="font-semibold text-foreground">{driverName}</span></p>
              {driverEcoCash && (
                <p className="text-xs text-muted-foreground mt-1">EcoCash: {driverEcoCash}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              💡 This will debit your EcoCash account and send payment directly to the driver.
            </p>
            {!walletPin ? (
              <div className="bg-destructive/10 rounded-xl p-3 text-center">
                <p className="text-sm text-destructive font-medium">⚠️ Set up your wallet PIN first</p>
                <p className="text-xs text-muted-foreground mt-1">Go to Wallet → Settings to create a PIN</p>
              </div>
            ) : (
              <Button onClick={() => setStep('pin')} className="w-full" size="lg">
                <Lock className="w-4 h-4 mr-2" /> Confirm & Enter PIN
              </Button>
            )}
          </div>
        )}

        {step === 'pin' && (
          <div className="text-center space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Enter your 5-digit wallet PIN</p>
            <div className="flex justify-center gap-3">
              {[0,1,2,3,4].map((i) => (
                <div key={i} className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all",
                  i < pin.length ? "bg-primary border-primary scale-110" : "border-muted-foreground/30"
                )} />
              ))}
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
                <button
                  key={key}
                  disabled={loading || !key}
                  onClick={() => key === '⌫' ? handleDelete() : key && handleDigit(key)}
                  className={cn(
                    "h-14 rounded-2xl text-xl font-bold transition-all active:scale-95",
                    key === '⌫' ? "text-muted-foreground hover:bg-muted" :
                    key ? "bg-accent hover:bg-accent/80 text-foreground" : ""
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center space-y-4 py-8">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-semibold text-foreground">Processing Payment...</p>
            <p className="text-sm text-muted-foreground">Sending {currency}{amount} via EcoCash</p>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-lg font-semibold text-foreground">Payment Sent!</p>
            <p className="text-sm text-muted-foreground">{currency}{amount} sent to {driverName}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
