import * as React from "react";
import { cn } from "@/lib/utils";

type StatusChipProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "warning" | "danger";
};

export function StatusChip({ className, tone = "default", ...props }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone === "default" && "bg-blue-50 text-blue-700 border border-blue-100",
        tone === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-100",
        tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-100",
        tone === "danger" && "bg-rose-50 text-rose-700 border border-rose-100",
        className,
      )}
      {...props}
    />
  );
}
