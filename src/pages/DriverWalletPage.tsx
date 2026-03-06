import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Wallet, ArrowDownLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface DepositRecord {
  id: string;
  amount_usd: number;
  status: string;
  created_at: string;
  ecocash_reference: string;
}

export default function DriverWalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [zarPerUsd, setZarPerUsd] = useState<number | null>(null);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const feeZar = 4;
  const feeUsdPreview = useMemo(() => {
    if (!zarPerUsd) return null;
    return Number((feeZar / zarPerUsd).toFixed(2));
  }, [zarPerUsd]);

  const load = useCallback(async () => {
    if (!user) return;
    setMsg("");
    setLoading(true);
    try {
      const w = await supabase
        .from("driver_wallets")
        .select("balance_usd")
        .eq("driver_id", user.id)
        .maybeSingle();
      if (w.error) throw w.error;
      setBalance(Number(w.data?.balance_usd ?? 0));

      const fx = await supabase
        .from("fx_rates")
        .select("zar_per_usd,effective_date")
        .order("effective_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
      if (fx.error) throw fx.error;
      setZarPerUsd(fx.data?.[0]?.zar_per_usd ? Number(fx.data[0].zar_per_usd) : null);

      const dep = await supabase
        .from("deposit_requests")
        .select("id,amount_usd,status,created_at,ecocash_reference")
        .eq("driver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!dep.error) setDeposits(dep.data ?? []);
    } catch (e: unknown) {
      setMsg((e as Error).message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const statusColor = (s: string) => {
    if (s === 'approved') return 'text-green-500';
    if (s === 'rejected') return 'text-red-500';
    return 'text-amber-500';
  };

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
            Balance
          </div>
          <div className="text-4xl font-black">${balance.toFixed(2)}</div>

          <div className="mt-4 bg-muted/50 rounded-xl p-3">
            <div className="font-bold text-sm">Today's Rate</div>
            {zarPerUsd ? (
              <>
                <div className="text-sm text-muted-foreground">$1 = {zarPerUsd} ZAR</div>
                <div className="text-sm font-bold mt-1">
                  Fee per trip: R4 ≈ ${feeUsdPreview?.toFixed(2)}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Rate not set. Contact admin.</div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <Button onClick={() => navigate("/drivers/deposit")} className="flex-1">
              <ArrowDownLeft className="h-4 w-4 mr-2" />
              Deposit (EcoCash)
            </Button>
            <Button variant="outline" size="icon" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Deposit History */}
        {deposits.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-muted-foreground">Deposit History</h3>
            {deposits.map((d) => (
              <div key={d.id} className="bg-card rounded-xl p-3 border flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">${Number(d.amount_usd).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(d.created_at), 'dd MMM yyyy, HH:mm')}
                  </div>
                  <div className="text-xs text-muted-foreground">{d.ecocash_reference}</div>
                </div>
                <span className={`text-xs font-bold capitalize ${statusColor(d.status)}`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {loading && <div className="text-center text-muted-foreground text-sm py-4">Loading…</div>}
      </div>
    </div>
  );
}
