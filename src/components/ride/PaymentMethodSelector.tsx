import { Banknote, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cash" | "wallet";

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  walletBalance?: number;
  estimatedFare?: number;
}

export default function PaymentMethodSelector({
  selected,
  onSelect,
  walletBalance = 0,
  estimatedFare = 0,
}: PaymentMethodSelectorProps) {
  const insufficient = estimatedFare > 0 && walletBalance < estimatedFare;

  const METHODS = [
    { id: "cash" as const, label: "Cash", icon: Banknote, desc: "Pay driver directly", disabled: false },
    {
      id: "wallet" as const,
      label: "Wallet",
      icon: Wallet,
      desc: insufficient ? `Low: $${walletBalance.toFixed(2)}` : `$${walletBalance.toFixed(2)} available`,
      disabled: insufficient,
    },
  ];

  return (
    <div className="flex gap-2">
      {METHODS.map((m) => {
        const Icon = m.icon;
        const active = selected === m.id;
        return (
          <button
            key={m.id}
            disabled={m.disabled}
            onClick={() => !m.disabled && onSelect(m.id)}
            aria-pressed={active}
            className={active 
              ? "flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl transition-all border-primary bg-accent text-primary-foreground py-0 px-0 my-0 border-0 opacity-80 text-left font-semibold font-sans text-8xl"
              : cn(
                  "flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all",
                  "border-border bg-background hover:border-primary/30"
                )
            }
          >
            <Icon className={cn("h-5 w-5", active ? "text-destructive" : "text-muted-foreground")} />
            <span className={cn("text-xs font-semibold", active ? "text-primary-foreground" : "text-foreground")}>
              {m.label}
            </span>
            <span className={cn("text-[10px]", active ? "text-primary-foreground" : "text-muted-foreground")}>{m.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
