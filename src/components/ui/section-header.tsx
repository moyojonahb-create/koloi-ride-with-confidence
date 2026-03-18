import * as React from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ title, subtitle, right, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div>
        <p className="text-base font-semibold text-slate-900">{title}</p>
        {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
