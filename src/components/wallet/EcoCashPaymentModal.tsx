import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Lock, Smartphone, ShieldCheck } from 'lucide-react';
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
  onSetPin?: (pin: string) => Promise<boolean>;
  onPaymentComplete: () => void;
}

export default function EcoCashPaymentModal({
  isOpen, onClose, amount, currency, driverName, driverEcoCash, walletPin, onVerifyPin, onSetPin, onPaymentComplete
}: EcoCashPaymentModalProps) {
  const [step, setStep] = useState<'confirm' | 'setup' | 'setup_confirm' | 'pin' | 'processing' | 'done'>('confirm');
  const [pin, setPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (step === 'setup' && setupPin.length < 5) {
      setSetupPin(setupPin + digit);
      setError('');
    } else if (step === 'setup_confirm' && pin.length < 5) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      if (newPin.length === 5) {
        handleConfirmSetup(newPin);
      }
    } else if (step === 'pin' && pin.length < 5) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      if (newPin.length === 5) {
        verifyAndPay(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'setup') setSetupPin(setupPin.slice(0, -1));
    else setPin(pin.slice(0, -1));
    setError('');
  };

  const handleSetupNext = () => {
    if (setupPin.length !== 5) { setError('PIN must be 5 digits'); return; }
    setPin('');
    setStep('setup_confirm');
  };

  const handleConfirmSetup = async (confirmPin: string) => {
    if (confirmPin !== setupPin) {
      setError('PINs do not match');
      setPin('');
      return;
    }
    if (!onSetPin) return;
    setLoading(true);
    const ok = await onSetPin(setupPin);
    setLoading(false);
    if (ok) {
      toast.success('Wallet PIN created!');
      // Now proceed to payment processing
      setStep('processing');
      await processPayment();
    } else {
      setError('Failed to set PIN');
      setPin('');
    }
  };

  const verifyAndPay = async (enteredPin: string) => {
    setLoading(true);
    try {
      const ok = await onVerifyPin(enteredPin);
      if (!ok) {
        setError('Incorrect PIN');
        setPin('');
        setLoading(false);
        return;
      }
      setStep('processing');
      await processPayment();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setPin('');
      setLoading(false);
    }
  };

  const processPayment = async () => {
    setLoading(true);
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
    setSetupPin('');
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    if (step !== 'processing') {
      onClose();
      resetState();
    }
  };

  const handleConfirmPay = () => {
    if (walletPin) {
      setStep('pin');
    } else {
      // No PIN set — start inline setup
      setStep('setup');
    }
  };

  const currentPin = step === 'setup' ? setupPin : pin;
  const title = step === 'setup' ? 'Create Wallet PIN' 
    : step === 'setup_confirm' ? 'Confirm PIN'
    : 'EcoCash Payment';
  const subtitle = step === 'setup' ? 'Create a 5-digit PIN to secure your wallet & payments'
    : step === 'setup_confirm' ? 'Re-enter your PIN to confirm'
    : step === 'pin' ? 'Enter your 5-digit wallet PIN to approve payment'
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            {(step === 'setup' || step === 'setup_confirm') ? (
              <ShieldCheck className="w-5 h-5 text-primary" />
            ) : (
              <Smartphone className="w-5 h-5 text-primary" />
            )}
            {title}
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
            {!walletPin && (
              <p className="text-xs text-center text-muted-foreground">
                🔐 You'll set up a wallet PIN to secure your payments
              </p>
            )}
            <Button onClick={handleConfirmPay} className="w-full" size="lg">
              <Lock className="w-4 h-4 mr-2" /> Confirm & {walletPin ? 'Enter PIN' : 'Set Up PIN'}
            </Button>
          </div>
        )}

        {(step === 'setup' || step === 'setup_confirm' || step === 'pin') && (
          <div className="text-center space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{subtitle}</p>
            <div className="flex justify-center gap-3">
              {[0,1,2,3,4].map((i) => (
                <div key={i} className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all",
                  i < currentPin.length ? "bg-primary border-primary scale-110" : "border-muted-foreground/30"
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
            {step === 'setup' && (
              <Button onClick={handleSetupNext} disabled={setupPin.length !== 5 || loading} className="w-full">
                Next
              </Button>
            )}
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
