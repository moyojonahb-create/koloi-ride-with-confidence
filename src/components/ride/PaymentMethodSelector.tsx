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
    {
      id: "cash" as const,
      label: "Cash",
      icon: Banknote,
      desc: "Pay driver",
      disabled: false,
    },
    {
      id: "wallet" as const,
      label: "Wallet",
      icon: Wallet,
      desc: insufficient ? "Low balance" : `$${walletBalance.toFixed(2)}`,
      disabled: insufficient,
    },
  ];

  return (
    <div className="flex flex-row gap-2 w-full">
      {METHODS.map((m) => {
        const Icon = m.icon;
        const active = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={m.disabled}
            onClick={() => !m.disabled && onSelect(m.id)}
            aria-pressed={active}
            className={cn(
              "flex-1 min-h-[48px] h-12 px-3 rounded-xl border transition-all duration-150",
              "flex flex-row items-center gap-2 text-left",
              "active:scale-[0.97]",
              active
                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                : "bg-background border-border text-foreground hover:bg-muted/50",
              m.disabled && "opacity-50 cursor-not-allowed active:scale-100",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active
                  ? "text-primary-foreground"
                  : m.disabled
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-semibold truncate">{m.label}</span>
              <span
                className={cn(
                  "text-[10px] truncate",
                  active
                    ? "text-primary-foreground/80"
                    : m.disabled
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {m.desc}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
