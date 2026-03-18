import * as React from "react";
import { cn } from "@/lib/utils";

type GlassSheetProps = React.HTMLAttributes<HTMLDivElement>;

export function GlassSheet({ className, ...props }: GlassSheetProps) {
  return (
    <div
      className={cn(
        "rounded-t-3xl border border-white/35 bg-white/30 shadow-[0_-14px_46px_rgba(0,0,0,0.22)] backdrop-blur-2xl",
        className,
      )}
      {...props}
    />
  );
}
