/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-105 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] rounded-full",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[var(--shadow-sm)] rounded-full",
        outline: "border-[0.5px] border-[var(--glass-border-subtle)] bg-[var(--glass-bg-ultra)] backdrop-blur-lg hover:bg-muted/60 rounded-full",
        secondary: "bg-[var(--glass-bg-ultra)] text-secondary-foreground border-[0.5px] border-[var(--glass-border-subtle)] backdrop-blur-lg hover:bg-muted/60 shadow-[var(--shadow-xs)] rounded-full",
        ghost: "hover:bg-muted/50 hover:text-foreground rounded-xl",
        link: "text-primary underline-offset-4 hover:underline",
        accent: "bg-primary text-primary-foreground font-bold hover:brightness-110 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] rounded-full",
        glass: "bg-[var(--glass-bg)] backdrop-blur-2xl backdrop-saturate-[1.8] border-[0.5px] border-[var(--glass-border)] text-foreground shadow-[var(--glass-shadow)] hover:bg-[var(--glass-bg-heavy)] rounded-full",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-4",
        lg: "h-14 px-8 text-base",
        xl: "h-16 px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
