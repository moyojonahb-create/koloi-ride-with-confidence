import * as React from "react";
import { cn } from "@/lib/utils";

type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className, ...props }: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        "relative h-[52px] rounded-2xl px-6 text-[15px] font-bold text-primary-foreground active:scale-[0.97] transition-all duration-150 overflow-hidden",
        "disabled:opacity-50",
        className,
      )}
      style={{
        background: 'linear-gradient(135deg, hsl(224 71% 37%), hsl(225 65% 48%))',
        boxShadow: 'var(--shadow-btn-primary)',
      }}
      {...props}
    />
  );
}
