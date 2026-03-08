import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Minus, X, Upload, Phone, Hash, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number, description?: string) => Promise<{ error: string | null }>;
  currentBalance: number;
}

const PAYMENT_METHODS = [
  { id: 'ecocash', name: 'EcoCash', color: 'bg-green-500', merchant: '+263 778 553 169' },
  { id: 'onemoney', name: 'OneMoney', color: 'bg-purple-500', merchant: '+263 712 000 000' },
  { id: 'telecash', name: 'Telecash', color: 'bg-blue-500', merchant: '+263 733 000 000' },
  { id: 'innbucks', name: 'InnBucks', color: 'bg-orange-500', merchant: '077 000 0000' },
  { id: 'zimswitch', name: 'ZimSwitch', color: 'bg-red-500', merchant: 'Acc: 1234567890' },
  { id: 'mukuru', name: 'Mukuru', color: 'bg-yellow-600', merchant: 'Agent: Voyex Ride' },
  { id: 'bank_transfer', name: 'Bank Transfer', color: 'bg-slate-600', merchant: 'FNB: 62xxxxxxx' },
] as const;

export default function DepositModal({ isOpen, onClose, currentBalance }: DepositModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'method' | 'details' | 'done'>('method');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [amount, setAmount] = useState(5);
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const quickAmounts = [1, 2, 5, 10, 20];
  const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod);

  const resetForm = () => {
    setStep('method');
    setSelectedMethod('');
    setAmount(5);
    setPhone('');
    setReference('');
    setProofFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !method) return;
    if (!phone.trim()) { toast.error('Enter your phone number'); return; }
    if (!reference.trim()) { toast.error('Enter the transaction reference'); return; }
    if (amount <= 0) { toast.error('Enter a valid amount'); return; }

    setLoading(true);
    try {
      let proofPath: string | null = null;

      // Upload proof if provided
      if (proofFile) {
        const ext = proofFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('rider-deposit-proofs')
          .upload(path, proofFile);
        if (uploadErr) throw uploadErr;
        proofPath = path;
      }

      // Insert deposit request
      const { error: insertErr } = await supabase
        .from('rider_deposit_requests')
        .insert({
          user_id: user.id,
          amount_usd: amount,
          payment_method: selectedMethod,
          phone_number: phone.trim(),
          reference: reference.trim(),
          proof_path: proofPath,
        });

      if (insertErr) throw insertErr;

      setStep('done');
    } catch (e: unknown) {
      toast.error('Failed to submit', { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {step === 'method' ? 'Top Up Wallet' : step === 'details' ? method?.name : 'Request Sent!'}
          </h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Balance */}
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground">Current Balance</p>
          <p className="text-xl font-black text-primary">${currentBalance.toFixed(2)}</p>
        </div>

        {/* Step 1: Select Payment Method */}
        {step === 'method' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Select Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMethod(m.id); setStep('details'); }}
                  className="flex items-center gap-2 p-3 rounded-xl border hover:border-primary transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-full ${m.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {m.name[0]}
                  </div>
                  <span className="text-sm font-medium truncate">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Enter Details */}
        {step === 'details' && method && (
          <div className="space-y-4">
            {/* Payment Instructions */}
            <div className="bg-accent/50 rounded-xl p-3 space-y-1">
              <p className="text-xs font-bold text-accent-foreground">Send payment to:</p>
              <p className="text-sm font-mono font-bold">{method.merchant}</p>
              <p className="text-xs text-muted-foreground">Then fill in the details below</p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Amount (USD)</p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAmount((a) => Math.max(1, a - 1))} disabled={amount <= 1}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-3xl font-black min-w-[80px] text-center">${amount}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAmount((a) => a + 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {quickAmounts.map((qa) => (
                  <Button key={qa} variant={amount === qa ? 'default' : 'outline'} size="sm" onClick={() => setAmount(qa)} className="min-w-[48px] h-7 text-xs">
                    ${qa}
                  </Button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone Number
              </label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0771234567" />
            </div>

            {/* Reference */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" /> Transaction Reference
              </label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. MP230712.1234.A00001" />
            </div>

            {/* Proof Upload */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" /> Payment Screenshot (optional)
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant="outline"
                className="w-full justify-start text-sm"
                onClick={() => fileRef.current?.click()}
              >
                {proofFile ? proofFile.name : 'Tap to upload screenshot'}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setStep('method'); setSelectedMethod(''); }}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'done' && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-bold">Deposit Request Sent!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your ${amount} {method?.name} deposit is being reviewed. Your wallet will be credited once approved.
              </p>
            </div>
            <Button className="w-full" onClick={handleClose}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}
