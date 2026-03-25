import * as React from "react";
import { cn } from "@/lib/utils";

type GlassSheetProps = React.HTMLAttributes<HTMLDivElement>;

export function GlassSheet({ className, ...props }: GlassSheetProps) {
  return (
    <div
      className={cn(
        "rounded-t-[28px] border border-[var(--glass-border)]",
        className,
      )}
      style={{
        background: 'var(--glass-bg-heavy)',
        backdropFilter: 'var(--glass-blur-heavy)',
        WebkitBackdropFilter: 'var(--glass-blur-heavy)',
        boxShadow: '0 -8px 40px hsl(224 71% 37% / 0.08), 0 0 0 0.5px hsla(0, 0%, 100%, 0.5)',
      }}
      {...props}
    />
  );
}
