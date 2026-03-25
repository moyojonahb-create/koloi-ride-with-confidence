import * as React from "react";
import { cn } from "@/lib/utils";

type SecondaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const SecondaryButton = React.forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "h-11 rounded-2xl px-4 text-sm font-medium text-foreground border border-[var(--glass-border)] active:scale-[0.98] transition-all",
          "shadow-[var(--glass-shadow)] disabled:opacity-50",
          className,
        )}
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
        }}
        {...props}
      />
    );
  }
);
SecondaryButton.displayName = "SecondaryButton";
