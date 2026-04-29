import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smartphone, Building2, Banknote, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { requestWithdrawal } from "@/lib/walletPayments";

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onSuccess?: () => void;
}

const METHODS = [
  { id: "ecocash" as const, label: "EcoCash", icon: Smartphone, hint: "077 / 078 number" },
  { id: "innbucks" as const, label: "InnBucks", icon: Banknote, hint: "InnBucks ID" },
  { id: "bank" as const, label: "Bank", icon: Building2, hint: "Account number" },
];

export default function WithdrawalModal({ isOpen, onClose, balance, onSuccess }: WithdrawalModalProps) {
  const [method, setMethod] = useState<"ecocash" | "innbucks" | "bank">("ecocash");
  const [amount, setAmount] = useState("10");
  const [destination, setDestination] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);

  const numAmount = Number(amount) || 0;

  const submit = async () => {
    if (numAmount < 5) return toast.error("Minimum withdrawal is $5");
    if (numAmount > balance) return toast.error("Amount exceeds balance");
    if (!destination.trim()) return toast.error("Destination required");
    setLoading(true);
    try {
      const res = await requestWithdrawal(numAmount, method, destination.trim(), accountName.trim() || undefined);
      if (res?.ok) {
        toast.success("Withdrawal requested. Pending admin approval.");
        onSuccess?.();
        onClose();
        setAmount("10");
        setDestination("");
        setAccountName("");
      } else {
        toast.error(res?.reason || "Withdrawal failed");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/40 rounded-2xl p-3 text-center">
            <div className="text-xs text-muted-foreground">Available</div>
            <div className="text-2xl font-black">${balance.toFixed(2)}</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">Method</div>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2.5 rounded-2xl border-2 transition-all",
                      active ? "border-primary bg-primary/10" : "border-border"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-[11px] font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Amount (USD)</label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={5}
              step={1}
              className="mt-1 h-11 text-lg font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              {METHODS.find((m) => m.id === method)?.hint}
            </label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={method === "ecocash" ? "0771234567" : method === "bank" ? "Account number" : "InnBucks ID"}
              className="mt-1 h-11"
            />
          </div>

          {method === "bank" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Account name</label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Full name"
                className="mt-1 h-11"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={submit} disabled={loading || numAmount < 5}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request Withdrawal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
