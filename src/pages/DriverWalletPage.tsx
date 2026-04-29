import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, ArrowDownLeft, ArrowUpRight, Send, TrendingUp, Receipt, Percent } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import WithdrawalModal from "@/components/wallet/WithdrawalModal";
import TransferMoneyModal from "@/components/wallet/TransferMoneyModal";

interface DepositRecord {
  id: string;
  amount_usd: number;
  status: string;
  created_at: string;
  ecocash_reference: string;
}

interface EarningRecord {
  id: string;
  ride_id: string | null;
  fare_amount: number;
  platform_fee: number;
  driver_earnings: number;
  created_at: string;
}

interface WithdrawalRecord {
  id: string;
  amount_usd: number;
  method: string;
  destination: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
}

export default function DriverWalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [tab, setTab] = useState<'earnings' | 'deposits' | 'withdrawals'>('earnings');

  const load = useCallback(async () => {
    if (!user) return;
    setMsg("");
    setLoading(true);
    try {
      const [w, dep, earn, wd] = await Promise.all([
        supabase.from("driver_wallets").select("balance_usd").eq("driver_id", user.id).maybeSingle(),
        supabase.from("deposit_requests").select("id,amount_usd,status,created_at,ecocash_reference")
          .eq("driver_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("admin_earnings").select("id,ride_id,fare_amount,platform_fee,driver_earnings,created_at")
          .eq("driver_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("withdrawals").select("id,amount_usd,method,destination,status,admin_note,created_at,approved_at")
          .eq("driver_id", user.id).order("created_at", { ascending: false }).limit(30),
      ]);
      if (w.error) throw w.error;
      setBalance(Number(w.data?.balance_usd ?? 0));
      if (!dep.error) setDeposits(dep.data ?? []);
      if (!earn.error) setEarnings((earn.data ?? []) as EarningRecord[]);
      if (!wd.error) setWithdrawals((wd.data ?? []) as WithdrawalRecord[]);
    } catch (e: unknown) {
      setMsg((e as Error).message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime: balance + new earnings as they come in
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`driver-wallet-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'driver_wallets', filter: `driver_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as { balance_usd?: number } | null)?.balance_usd;
          if (typeof next === 'number') setBalance(Number(next));
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_earnings', filter: `driver_id=eq.${user.id}` },
        (payload) => {
          setEarnings((prev) => [payload.new as EarningRecord, ...prev].slice(0, 50));
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawals', filter: `driver_id=eq.${user.id}` },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const statusColor = (s: string) => {
    if (s === 'approved') return 'text-green-500';
    if (s === 'rejected') return 'text-destructive';
    return 'text-amber-500';
  };

  // Aggregate stats
  const totalEarned = earnings.reduce((s, e) => s + Number(e.driver_earnings), 0);
  const totalCommission = earnings.reduce((s, e) => s + Number(e.platform_fee), 0);
  const totalRides = earnings.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Driver Wallet (USD)</h1>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {msg && <div className="text-destructive font-bold text-sm">{msg}</div>}

        {/* Balance Card */}
        <div className="bg-card rounded-2xl p-5 border shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Wallet className="h-4 w-4" />
            Available Balance
          </div>
          <div className="text-4xl font-black">${balance.toFixed(2)}</div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button onClick={() => navigate("/drivers/deposit")} variant="outline">
              <ArrowDownLeft className="h-4 w-4 mr-1" /> Deposit
            </Button>
            <Button onClick={() => setShowWithdraw(true)} disabled={balance < 5}>
              <ArrowUpRight className="h-4 w-4 mr-1" /> Withdraw
            </Button>
            <Button onClick={() => setShowTransfer(true)} variant="outline" className="col-span-2" disabled={balance <= 0}>
              <Send className="h-4 w-4 mr-2" /> Send Money
            </Button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border rounded-xl p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Earned</div>
            <div className="text-sm font-black">${totalEarned.toFixed(2)}</div>
          </div>
          <div className="bg-card border rounded-xl p-3 text-center">
            <Receipt className="h-4 w-4 mx-auto text-primary mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Trips</div>
            <div className="text-sm font-black">{totalRides}</div>
          </div>
          <div className="bg-card border rounded-xl p-3 text-center">
            <Percent className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Fees</div>
            <div className="text-sm font-black">${totalCommission.toFixed(2)}</div>
          </div>
        </div>

        <WithdrawalModal isOpen={showWithdraw} onClose={() => setShowWithdraw(false)} balance={balance} onSuccess={load} />
        <TransferMoneyModal isOpen={showTransfer} onClose={() => setShowTransfer(false)} balance={balance} onSuccess={load} />

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          <button
            onClick={() => setTab('earnings')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tab === 'earnings' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            Earnings ({earnings.length})
          </button>
          <button
            onClick={() => setTab('deposits')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tab === 'deposits' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            Deposits ({deposits.length})
          </button>
        </div>

        {/* Earnings History */}
        {tab === 'earnings' && (
          <div className="space-y-2">
            {earnings.length === 0 && !loading && (
              <div className="bg-card border rounded-xl p-6 text-center text-sm text-muted-foreground">
                No completed rides yet. Earnings appear here automatically.
              </div>
            )}
            {earnings.map((e) => (
              <div key={e.id} className="bg-card rounded-xl p-3 border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm">+${Number(e.driver_earnings).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(e.created_at), 'dd MMM yyyy, HH:mm')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-muted-foreground">Fare ${Number(e.fare_amount).toFixed(2)}</div>
                    <div className="text-[10px] text-amber-600">−${Number(e.platform_fee).toFixed(2)} (15%)</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Deposit History */}
        {tab === 'deposits' && (
          <div className="space-y-2">
            {deposits.length === 0 && !loading && (
              <div className="bg-card border rounded-xl p-6 text-center text-sm text-muted-foreground">
                No deposits yet.
              </div>
            )}
            {deposits.map((d) => (
              <div key={d.id} className="bg-card rounded-xl p-3 border flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">${Number(d.amount_usd).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(d.created_at), 'dd MMM yyyy, HH:mm')}
                  </div>
                  <div className="text-xs text-muted-foreground">{d.ecocash_reference}</div>
                </div>
                <span className={`text-xs font-bold capitalize ${statusColor(d.status)}`}>{d.status}</span>
              </div>
            ))}
          </div>
        )}

        {loading && <div className="text-center text-muted-foreground text-sm py-4">Loading…</div>}
      </div>
    </div>
  );
}
