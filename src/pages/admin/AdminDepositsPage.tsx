import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Eye, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import AdminGuard from "@/components/admin/AdminGuard";

interface DepositRow {
  id: string;
  driver_id: string;
  amount_usd: number;
  ecocash_phone: string;
  ecocash_reference: string;
  proof_path: string | null;
  created_at: string;
  status: string;
}

function AdminDepositsPageInner() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("deposit_requests")
      .select("id,driver_id,amount_usd,ecocash_phone,ecocash_reference,proof_path,created_at,status")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("deposit-proofs")
      .createSignedUrl(path, 60 * 10);
    if (error) { toast.error("Could not load proof"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const approve = async (id: string) => {
    const { data, error } = await supabase.rpc("admin_approve_deposit", {
      p_deposit_id: id,
      p_note: "Approved after EcoCash confirmation",
    });
    if (error) { toast.error(error.message); return; }
    if (!(data as any)?.ok) { toast.error("Approval failed"); return; }
    toast.success("Deposit approved and credited!");
    await load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Pending Deposits</h1>
        <Button variant="ghost" size="icon" onClick={load} className="ml-auto" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {rows.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">No pending deposits.</div>
        )}

        {rows.map((r) => (
          <div key={r.id} className="bg-card rounded-xl p-4 border space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg font-black">${Number(r.amount_usd).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Phone: {r.ecocash_phone}</div>
            <div className="text-sm text-muted-foreground">Ref: {r.ecocash_reference}</div>
            <div className="flex gap-2 pt-1">
              {r.proof_path && (
                <Button variant="outline" size="sm" onClick={() => viewProof(r.proof_path!)}>
                  <Eye className="h-4 w-4 mr-1" /> View Proof
                </Button>
              )}
              <Button size="sm" onClick={() => approve(r.id)}>
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
              </Button>
            </div>
          </div>
        ))}

        {loading && <div className="text-center text-muted-foreground text-sm py-4">Loading…</div>}
      </div>
    </div>
  );
}

export default function AdminDepositsPage() {
  return (
    <AdminGuard>
      <AdminDepositsPageInner />
    </AdminGuard>
  );
}
