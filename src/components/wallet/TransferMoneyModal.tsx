import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Search, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { transferFunds, lookupUserByPhone } from "@/lib/walletPayments";
import { useWalletPin } from "@/hooks/useWalletPin";
import WalletPinModal from "./WalletPinModal";

interface TransferMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onSuccess?: () => void;
}

export default function TransferMoneyModal({ isOpen, onClose, balance, onSuccess }: TransferMoneyModalProps) {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [recipient, setRecipient] = useState<{ user_id: string; full_name: string | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const { hasPin, verifyPin, setPin } = useWalletPin();

  const numAmount = Number(amount) || 0;

  const search = async () => {
    if (!phone.trim()) return;
    setSearching(true);
    try {
      const r = await lookupUserByPhone(phone.trim());
      if (r) {
        setRecipient(r);
        toast.success(`Found: ${r.full_name || "User"}`);
      } else {
        setRecipient(null);
        toast.error("No user found with that phone number");
      }
    } finally {
      setSearching(false);
    }
  };

  const reset = () => {
    setPhone(""); setAmount(""); setNote(""); setRecipient(null);
  };

  const doTransfer = async () => {
    setLoading(true);
    try {
      const res = await transferFunds(recipient!.user_id, numAmount, note.trim() || undefined);
      if (res?.ok) {
        toast.success(`Sent $${numAmount.toFixed(2)} to ${recipient!.full_name || "user"}`);
        onSuccess?.();
        reset();
        onClose();
      } else {
        toast.error(res?.reason || "Transfer failed");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!recipient) return toast.error("Select a recipient first");
    if (numAmount <= 0) return toast.error("Enter an amount");
    if (numAmount > balance) return toast.error("Insufficient balance");
    if (numAmount > 500) return toast.error("Maximum $500 per transfer");

    if (hasPin) {
      setPinOpen(true);
    } else {
      // Force PIN setup before first transfer
      setPinOpen(true);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Send Money</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/40 rounded-2xl p-3 text-center">
              <div className="text-xs text-muted-foreground">Your balance</div>
              <div className="text-2xl font-black">${balance.toFixed(2)}</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Recipient phone</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setRecipient(null); }}
                  placeholder="0771234567"
                  className="h-11"
                />
                <Button onClick={search} disabled={searching || !phone.trim()} variant="outline" className="h-11">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {recipient && (
                <div className="mt-2 p-2.5 rounded-2xl bg-primary/10 flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{recipient.full_name || "User"}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Amount (USD)</label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 h-11 text-lg font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Note (optional)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={80}
                placeholder="What for?"
                className="mt-1 h-11"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSend}
                disabled={loading || !recipient || numAmount <= 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WalletPinModal
        isOpen={pinOpen}
        onClose={() => setPinOpen(false)}
        onVerified={() => { setPinOpen(false); doTransfer(); }}
        mode={hasPin ? "verify" : "setup"}
        onVerifyPin={verifyPin}
        onSetPin={setPin}
      />
    </>
  );
}
