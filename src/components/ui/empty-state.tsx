import * as React from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";

type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, className, action }: EmptyStateProps) {
  return (
    <GlassCard className={cn("p-5 text-center space-y-2", className)}>
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {description && <p className="text-sm text-slate-600">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </GlassCard>
  );
}
