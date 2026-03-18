import * as React from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  intense?: boolean;
};

export function GlassCard({ className, intense = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/50 bg-white/75 backdrop-blur-xl shadow-[0_12px_32px_rgba(15,23,42,0.14)]",
        intense && "bg-white/82 shadow-[0_16px_38px_rgba(15,23,42,0.18)]",
        className,
      )}
      {...props}
    />
  );
}
