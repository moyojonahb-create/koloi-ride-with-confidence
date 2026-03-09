import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, Wallet, Clock, CheckCircle, XCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import DepositModal from '@/components/wallet/DepositModal';
import WalletPinModal from '@/components/wallet/WalletPinModal';
import WalletSettings from '@/components/wallet/WalletSettings';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface RiderDeposit {
  id: string;
  amount_usd: number;
  payment_method: string;
  reference: string;
  status: string;
  created_at: string;
}

const METHOD_LABELS: Record<string, string> = {
  ecocash: 'EcoCash', onemoney: 'OneMoney', telecash: 'Telecash',
  innbucks: 'InnBucks', zimswitch: 'ZimSwitch', mukuru: 'Mukuru',
  bank_transfer: 'Bank Transfer',
};

export default function RiderWalletPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, deposit, refresh: refreshWallet, loading: walletLoading } = useWallet();
  const [showDeposit, setShowDeposit] = useState(false);
  const [deposits, setDeposits] = useState<RiderDeposit[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // PIN state
  const [hasPin, setHasPin] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [walletPin, setWalletPin] = useState<string | null>(null);

  // Check if user has a PIN set
  const checkPin = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wallets')
      .select('wallet_pin')
      .eq('user_id', user.id)
      .maybeSingle();
    const pin = (data as Record<string, unknown>)?.wallet_pin as string | null;
    setWalletPin(pin);
    setHasPin(!!pin);
    if (!pin) setPinVerified(true); // No pin = no gate
  }, [user]);

  useEffect(() => { checkPin(); }, [checkPin]);

  // Show PIN modal if PIN is set and not yet verified
  useEffect(() => {
    if (hasPin && !pinVerified) {
      setShowPinModal(true);
    }
  }, [hasPin, pinVerified]);

  const handleVerifyPin = async (enteredPin: string): Promise<boolean> => {
    return enteredPin === walletPin;
  };

  const handleSetPin = async (newPin: string): Promise<boolean> => {
    if (!user) return false;
    // Ensure wallet exists
    const { data: existing } = await supabase.from('wallets').select('id').eq('user_id', user.id).maybeSingle();
    if (!existing) {
      await supabase.from('wallets').insert({ user_id: user.id, balance: 0, wallet_pin: newPin });
    } else {
      await supabase.from('wallets').update({ wallet_pin: newPin } as Record<string, unknown>).eq('user_id', user.id);
    }
    setWalletPin(newPin);
    setHasPin(true);
    setPinVerified(true);
    return true;
  };

  const loadDeposits = useCallback(async () => {
    if (!user) return;
    setLoadingDeposits(true);
    const { data } = await supabase
      .from('rider_deposit_requests')
      .select('id,amount_usd,payment_method,reference,status,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setDeposits((data as RiderDeposit[]) ?? []);
    setLoadingDeposits(false);
  }, [user]);

  useEffect(() => { if (pinVerified) loadDeposits(); }, [loadDeposits, pinVerified]);

  const handleRefresh = () => { refreshWallet(); loadDeposits(); };

  const statusIcon = (s: string) => {
    if (s === 'approved') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === 'rejected') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  useEffect(() => { if (!user) navigate('/auth'); }, [user, navigate]);

  // PIN gate: show PIN modal overlay
  if (hasPin && !pinVerified) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <WalletPinModal
          isOpen={showPinModal}
          onClose={() => navigate(-1)}
          onVerified={() => setPinVerified(true)}
          mode="verify"
          onVerifyPin={handleVerifyPin}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">My Wallet</h1>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={walletLoading}>
            <RefreshCw className={`h-4 w-4 ${walletLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-lg mx-auto pb-28">
        {/* Balance Card */}
        <div className="rounded-2xl p-6 text-center space-y-2" style={{ background: 'var(--gradient-primary)' }}>
          <Wallet className="h-8 w-8 text-primary-foreground mx-auto opacity-80" />
          <p className="text-sm text-primary-foreground/80">Available Balance</p>
          <p className="text-4xl font-black text-primary-foreground">${balance.toFixed(2)}</p>
          <Button
            onClick={() => setShowDeposit(true)}
            className="mt-3 bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
          >
            <Plus className="h-4 w-4 mr-2" /> Top Up Wallet
          </Button>
        </div>

        {/* Settings panel (collapsible) */}
        {showSettings && (
          <WalletSettings
            hasPin={hasPin}
            onSetPin={handleSetPin}
            onVerifyPin={handleVerifyPin}
          />
        )}

        {/* Quick info */}
        <div className="bg-accent/30 rounded-xl p-3 text-sm text-muted-foreground">
          💡 Top up your wallet via EcoCash, OneMoney, Telecash, InnBucks, ZimSwitch, Mukuru, or Bank Transfer. Your balance is credited once admin verifies payment.
        </div>

        {/* Deposit History */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Deposit History</h2>
          
          {deposits.length === 0 && !loadingDeposits && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No deposits yet. Tap "Top Up Wallet" to get started.
            </div>
          )}

          <div className="space-y-2">
            {deposits.map((d) => (
              <div key={d.id} className="bg-card rounded-xl p-3 border flex items-center gap-3">
                {statusIcon(d.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">${Number(d.amount_usd).toFixed(2)}</span>
                    <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                      {METHOD_LABELS[d.payment_method] || d.payment_method}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Ref: {d.reference} · {format(new Date(d.created_at), 'dd MMM, HH:mm')}
                  </div>
                </div>
                <span className={`text-xs font-bold capitalize ${
                  d.status === 'approved' ? 'text-green-500' : d.status === 'rejected' ? 'text-destructive' : 'text-amber-500'
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>

          {loadingDeposits && <div className="text-center text-muted-foreground text-sm py-4">Loading…</div>}
        </div>
      </div>

      <DepositModal
        isOpen={showDeposit}
        onClose={() => { setShowDeposit(false); handleRefresh(); }}
        onDeposit={deposit}
        currentBalance={balance}
      />
    </div>
  );
}
