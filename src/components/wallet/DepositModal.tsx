import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Minus, X } from 'lucide-react';
import { toast } from 'sonner';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number, description?: string) => Promise<{ error: string | null }>;
  currentBalance: number;
}

export default function DepositModal({ isOpen, onClose, onDeposit, currentBalance }: DepositModalProps) {
  const [amount, setAmount] = useState(50);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickAmounts = [20, 50, 100, 200, 500];

  const handleDeposit = async () => {
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    const result = await onDeposit(amount, description || undefined);
    setLoading(false);

    if (result.error) {
      toast.error('Deposit failed', { description: result.error });
    } else {
      toast.success('Deposit successful!', { description: `R${amount.toFixed(2)} added to your wallet` });
      setAmount(50);
      setDescription('');
      onClose();
    }
  };

  const incrementAmount = (step: number) => {
    setAmount((prev) => Math.max(5, prev + step));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-6 space-y-6 animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Deposit to Wallet</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Current Balance */}
        <div className="bg-blue-500/10 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-2xl font-black text-blue-500">R{currentBalance.toFixed(2)}</p>
        </div>

        {/* Amount Selector */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Amount to Deposit</p>
          
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => incrementAmount(-5)}
              disabled={amount <= 5}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[120px]">
              <p className="text-4xl font-black">R{amount}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => incrementAmount(5)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Amounts */}
          <div className="flex flex-wrap gap-2 justify-center">
            {quickAmounts.map((qa) => (
              <Button
                key={qa}
                variant={amount === qa ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAmount(qa)}
                className="min-w-[60px]"
              >
                R{qa}
              </Button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Reference (optional)
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., EcoCash deposit"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-blue-500 hover:bg-blue-600"
            onClick={handleDeposit}
            disabled={loading || amount <= 0}
          >
            {loading ? 'Processing...' : `Deposit R${amount}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
