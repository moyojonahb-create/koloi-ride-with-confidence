import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  mode: 'verify' | 'setup' | 'change';
  onSetPin?: (pin: string) => Promise<boolean>;
  onVerifyPin?: (pin: string) => Promise<boolean>;
}

export default function WalletPinModal({ isOpen, onClose, onVerified, mode, onSetPin, onVerifyPin }: WalletPinModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setStep('enter');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleDigit = (digit: string) => {
    if (step === 'enter' && pin.length < 5) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      if (mode === 'verify' && newPin.length === 5) {
        handleVerify(newPin);
      }
    } else if (step === 'confirm' && confirmPin.length < 5) {
      setConfirmPin(confirmPin + digit);
      setError('');
    }
  };

  const handleDelete = () => {
    if (step === 'enter') setPin(pin.slice(0, -1));
    else setConfirmPin(confirmPin.slice(0, -1));
    setError('');
  };

  const handleVerify = async (pinToVerify: string) => {
    if (!onVerifyPin) return;
    setLoading(true);
    const ok = await onVerifyPin(pinToVerify);
    setLoading(false);
    if (ok) {
      onVerified();
    } else {
      setError('Incorrect PIN. Try again.');
      setPin('');
    }
  };

  const handleSetupNext = () => {
    if (pin.length !== 5) { setError('PIN must be 5 digits'); return; }
    setStep('confirm');
  };

  const handleSetupConfirm = async () => {
    if (confirmPin !== pin) {
      setError('PINs do not match');
      setConfirmPin('');
      return;
    }
    if (!onSetPin) return;
    setLoading(true);
    const ok = await onSetPin(pin);
    setLoading(false);
    if (ok) {
      onVerified();
    } else {
      setError('Failed to set PIN');
    }
  };

  const currentPin = step === 'enter' ? pin : confirmPin;
  const title = mode === 'verify' ? 'Enter Wallet PIN' : step === 'enter' ? 'Create Wallet PIN' : 'Confirm PIN';
  const subtitle = mode === 'verify' 
    ? 'Enter your 5-digit PIN to access your wallet' 
    : step === 'enter' 
    ? 'Create a 5-digit PIN to secure your wallet'
    : 'Re-enter your PIN to confirm';

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <Lock className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-5 py-2">
          <p className="text-sm text-muted-foreground">{subtitle}</p>

          {/* PIN dots */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={cn(
                "w-4 h-4 rounded-full border-2 transition-all",
                i < currentPin.length
                  ? "bg-primary border-primary scale-110"
                  : "border-muted-foreground/30"
              )} />
            ))}
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          {/* Numpad */}
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

          {/* Action buttons */}
          {mode !== 'verify' && step === 'enter' && (
            <Button onClick={handleSetupNext} disabled={pin.length !== 5 || loading} className="w-full">
              Next
            </Button>
          )}
          {mode !== 'verify' && step === 'confirm' && (
            <Button onClick={handleSetupConfirm} disabled={confirmPin.length !== 5 || loading} className="w-full">
              <ShieldCheck className="w-4 h-4 mr-2" /> Set PIN
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
