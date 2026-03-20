import * as React from "react";
import { cn } from "@/lib/utils";

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-3xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/25",
          className,
        )}
        {...props}
      />
    );
  }
);
InputField.displayName = "InputField";
