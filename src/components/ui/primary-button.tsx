import * as React from "react";
import { cn } from "@/lib/utils";

type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className, ...props }: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        "h-12 rounded-3xl px-4 text-sm font-semibold text-primary active:scale-[0.98] transition-all",
        "border border-white/30 bg-primary/20 backdrop-blur-xl shadow-[0_4px_16px_hsl(var(--primary)/0.2)] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
