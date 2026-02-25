import { Banknote, Wallet, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cash" | "wallet" | "card";

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  walletBalance?: number;
}

const METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote; desc: string }[] = [
  { id: "cash", label: "Cash", icon: Banknote, desc: "Pay driver directly" },
  { id: "wallet", label: "Wallet", icon: Wallet, desc: "Use your balance" },
  { id: "card", label: "Card", icon: CreditCard, desc: "Coming soon" },
];

export default function PaymentMethodSelector({ selected, onSelect, walletBalance }: PaymentMethodSelectorProps) {
  return (
    <div className="flex gap-2">
      {METHODS.map((m) => {
        const isDisabled = m.id === "card";
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            onClick={() => !isDisabled && onSelect(m.id)}
            disabled={isDisabled}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all",
              selected === m.id
                ? "border-primary bg-primary/10"
                : "border-border bg-background hover:border-primary/30",
              isDisabled && "opacity-40 cursor-not-allowed"
            )}
          >
            <Icon className={cn("h-5 w-5", selected === m.id ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-xs font-semibold", selected === m.id ? "text-primary" : "text-foreground")}>
              {m.label}
            </span>
            {m.id === "wallet" && walletBalance != null && (
              <span className="text-[10px] text-muted-foreground">R{walletBalance.toFixed(0)}</span>
            )}
            {isDisabled && <span className="text-[10px] text-muted-foreground">Soon</span>}
          </button>
        );
      })}
    </div>
  );
}
