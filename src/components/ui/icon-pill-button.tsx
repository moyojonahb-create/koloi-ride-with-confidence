import * as React from "react";
import { cn } from "@/lib/utils";

type IconPillButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const IconPillButton = React.forwardRef<HTMLButtonElement, IconPillButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "h-10 px-3 rounded-full border border-[var(--glass-border)] text-foreground text-xs font-medium inline-flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50",
          className,
        )}
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          boxShadow: 'var(--glass-shadow)',
        }}
        {...props}
      />
    );
  }
);
IconPillButton.displayName = "IconPillButton";
