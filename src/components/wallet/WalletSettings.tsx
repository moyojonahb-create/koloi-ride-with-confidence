import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';
import WalletPinModal from './WalletPinModal';
import { toast } from 'sonner';

interface WalletSettingsProps {
  hasPin: boolean;
  onSetPin: (pin: string) => Promise<boolean>;
  onVerifyPin: (pin: string) => Promise<boolean>;
}

export default function WalletSettings({ hasPin, onSetPin, onVerifyPin }: WalletSettingsProps) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'change'>('setup');

  const handleOpenSetup = () => {
    setPinMode(hasPin ? 'change' : 'setup');
    setShowPinModal(true);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <KeyRound className="w-4 h-4" /> Security
      </h3>

      <div className="bg-card rounded-xl p-4 border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasPin ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
              {hasPin ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-destructive" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Wallet PIN</p>
              <p className="text-xs text-muted-foreground">
                {hasPin ? '5-digit PIN is set ✓' : 'No PIN set — required for payments'}
              </p>
            </div>
          </div>
          <Button variant={hasPin ? "outline" : "default"} size="sm" onClick={handleOpenSetup}>
            {hasPin ? 'Change' : 'Set PIN'}
          </Button>
        </div>
      </div>

      <WalletPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onVerified={() => toast.success(hasPin ? 'PIN changed!' : 'PIN created!')}
        mode={pinMode}
        onSetPin={onSetPin}
        onVerifyPin={onVerifyPin}
      />
    </div>
  );
}
