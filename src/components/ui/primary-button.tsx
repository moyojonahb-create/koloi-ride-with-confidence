import * as React from "react";
import { cn } from "@/lib/utils";

type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className, ...props }: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        "h-12 rounded-3xl px-4 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(37,99,235,0.35)] active:scale-[0.98] transition-all",
        "bg-gradient-to-r from-blue-600 to-sky-500 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
