import * as React from "react";
import { cn } from "@/lib/utils";

type IconPillButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function IconPillButton({ className, ...props }: IconPillButtonProps) {
  return (
    <button
      className={cn(
        "h-10 px-3 rounded-full border border-slate-200 bg-white/90 backdrop-blur text-slate-900 text-xs font-medium inline-flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
