import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PromoCodeInputProps {
  fare: number;
  onApply: (discount: number, promoId: string) => void;
  onRemove: () => void;
  appliedDiscount: number | null;
}

export default function PromoCodeInput({ fare, onApply, onRemove, appliedDiscount }: PromoCodeInputProps) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const handleApply = async () => {
    if (!code.trim() || !user) return;
    setChecking(true);
    try {
      const { data: promoRaw, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!promoRaw) {
        toast.error("Invalid promo code");
        return;
      }

      const promo = promoRaw;

      // Check expiry
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        toast.error("This promo code has expired");
        return;
      }

      // Check max uses
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        toast.error("This promo code has reached its limit");
        return;
      }

      // Check min fare
      if (promo.min_fare && fare < promo.min_fare) {
        toast.error(`Minimum fare of R${promo.min_fare} required`);
        return;
      }

      // Check if user already used it
      const { data: existing } = await supabase
        .from("promo_usage")
        .select("id")
        .eq("promo_id", promo.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.error("You've already used this promo code");
        return;
      }

      // Calculate discount
      let discount = 0;
      if (promo.discount_type === "percentage") {
        discount = Math.round(fare * (promo.discount_value / 100));
      } else {
        discount = Math.min(promo.discount_value, fare);
      }

      onApply(discount, promo.id);
      toast.success(`Promo applied! R${discount} off`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast.error("Failed to apply promo", { description: message });
    } finally {
      setChecking(false);
    }
  };

  if (appliedDiscount !== null) {
    return (
      <div className="flex items-center justify-between bg-accent/10 rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-accent">Promo applied: -R{appliedDiscount}</span>
        </div>
        <button onClick={onRemove} className="p-1 hover:bg-muted rounded-full">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="w-full flex items-center gap-2 justify-center text-sm text-muted-foreground hover:text-foreground py-1 transition-colors"
      >
        <Tag className="h-4 w-4" />
        Have a promo code?
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter promo code"
        className="flex-1 uppercase"
        maxLength={10}
      />
      <Button onClick={handleApply} disabled={!code.trim() || checking} size="sm">
        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => { setShowInput(false); setCode(""); }}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
