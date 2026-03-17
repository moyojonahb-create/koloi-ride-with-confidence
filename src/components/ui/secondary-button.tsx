import * as React from "react";
import { cn } from "@/lib/utils";

type SecondaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function SecondaryButton({ className, ...props }: SecondaryButtonProps) {
  return (
    <button
      className={cn(
        "h-11 rounded-3xl px-4 text-sm font-medium text-slate-900 border border-slate-200 bg-white/90 backdrop-blur active:scale-[0.98] transition-all",
        "shadow-[0_8px_20px_rgba(15,23,42,0.08)] disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
