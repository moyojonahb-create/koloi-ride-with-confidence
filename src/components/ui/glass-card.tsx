import * as React from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  intense?: boolean;
};

export function GlassCard({ className, intense = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[var(--glass-border)]",
        className,
      )}
      style={{
        background: intense ? 'var(--glass-bg-ultra)' : 'var(--glass-bg)',
        backdropFilter: intense ? 'var(--glass-blur-heavy)' : 'var(--glass-blur)',
        WebkitBackdropFilter: intense ? 'var(--glass-blur-heavy)' : 'var(--glass-blur)',
        boxShadow: intense ? 'var(--glass-shadow-lg)' : 'var(--glass-shadow)',
      }}
      {...props}
    />
  );
}
