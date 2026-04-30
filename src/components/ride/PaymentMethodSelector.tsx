import { memo, useCallback, useMemo } from "react";
import { Banknote, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cash" | "wallet";

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  walletBalance?: number;
  estimatedFare?: number;
}

function PaymentMethodSelectorImpl({
  selected,
  onSelect,
  walletBalance = 0,
  estimatedFare = 0,
}: PaymentMethodSelectorProps) {
  const insufficient = estimatedFare > 0 && walletBalance < estimatedFare;

  const walletCaption = useMemo(() => {
    if (estimatedFare <= 0) return `$${walletBalance.toFixed(2)}`;
    if (insufficient) return "Low balance";
    return `$${walletBalance.toFixed(2)}`;
  }, [estimatedFare, insufficient, walletBalance]);

  const handleSelect = useCallback(
    (m: PaymentMethod, disabled?: boolean) => {
      if (disabled) return;
      if (m === selected) return;
      onSelect(m);
    },
    [onSelect, selected]
  );

  return (
    <div
      role="radiogroup"
      aria-label="Payment method"
      className={cn(
        "box-border h-14 max-h-14 w-full",
        "rounded-full border border-border/60 bg-card/80 backdrop-blur-sm",
        "p-1 flex items-center gap-1"
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected === "cash"}
        onClick={() => handleSelect("cash")}
        className={cn(
          "h-full flex-1 rounded-full px-3",
          "inline-flex items-center justify-center gap-2",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "active:scale-[0.99]",
          selected === "cash"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-transparent text-foreground hover:bg-muted/50"
        )}
      >
        <Banknote
          className={cn(
            "h-4 w-4",
            selected === "cash" ? "text-primary-foreground" : "text-muted-foreground"
          )}
        />
        <span className="text-sm font-semibold">Cash</span>
        <span
          className={cn(
            "ml-1 text-[11px] font-medium tabular-nums",
            selected === "cash" ? "text-primary-foreground/80" : "text-muted-foreground"
          )}
        >
          Pay driver
        </span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={selected === "wallet"}
        disabled={insufficient}
        onClick={() => handleSelect("wallet", insufficient)}
        className={cn(
          "h-full flex-1 rounded-full px-3",
          "inline-flex items-center justify-center gap-2",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "active:scale-[0.99]",
          selected === "wallet"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-transparent text-foreground hover:bg-muted/50",
          insufficient && "opacity-60 cursor-not-allowed hover:bg-transparent active:scale-100"
        )}
      >
        <Wallet
          className={cn(
            "h-4 w-4",
            selected === "wallet"
              ? "text-primary-foreground"
              : insufficient
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        />
        <span className="text-sm font-semibold">Wallet</span>
        <span
          className={cn(
            "ml-1 text-[11px] font-medium tabular-nums",
            selected === "wallet"
              ? "text-primary-foreground/80"
              : insufficient
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          {walletCaption}
        </span>
      </button>
    </div>
  );
}

const PaymentMethodSelector = memo(PaymentMethodSelectorImpl);
export default PaymentMethodSelector;
