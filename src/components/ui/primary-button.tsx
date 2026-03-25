import * as React from "react";
import { cn } from "@/lib/utils";

type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className, ...props }: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        "h-12 rounded-3xl px-4 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-all",
        "bg-primary hover:brightness-110 shadow-[0_4px_16px_hsl(var(--primary)/0.35)] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
