import { Banknote, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cash" | "ecocash";

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

const METHODS: {id: PaymentMethod; label: string; icon: typeof Banknote; desc: string;}[] = [
  { id: "cash", label: "Cash", icon: Banknote, desc: "Pay driver directly" },
  { id: "ecocash", label: "EcoCash", icon: Smartphone, desc: "Pay via EcoCash" },
];

export default function PaymentMethodSelector({ selected, onSelect }: PaymentMethodSelectorProps) {
  return (
    <div className="flex gap-2">
      {METHODS.map((m) => {
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={cn("flex-1 flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all bg-accent",
              selected === m.id ?
              "border-primary bg-primary/10" :
              "border-border bg-background hover:border-primary/30"
            )}>
            <Icon className={cn("h-5 w-5", selected === m.id ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-xs font-semibold", selected === m.id ? "text-primary" : "text-foreground")}>
              {m.label}
            </span>
            <span className="text-[10px] text-muted-foreground">{m.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
