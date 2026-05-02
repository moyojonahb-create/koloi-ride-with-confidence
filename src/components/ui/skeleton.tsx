import { cn } from "@/lib/utils";

/**
 * Base skeleton — subtle grey base + left-to-right shimmer overlay.
 * The shimmer keyframes are defined in `tailwind.config.ts`/`index.css`
 * (falls back to `animate-pulse` if a consumer overrides the className).
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.6s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
        "dark:before:via-white/10",
        className,
      )}
      {...props}
    />
  );
}

/* ─── Reusable building blocks ─── */

export function SkeletonBox({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-12 w-full rounded-xl", className)} {...props} />;
}

export function SkeletonText({
  lines = 1,
  className,
  ...props
}: { lines?: number } & React.HTMLAttributes<HTMLDivElement>) {
  if (lines <= 1) {
    return <Skeleton className={cn("h-3 w-2/3 rounded", className)} {...props} />;
  }
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3 rounded", i === lines - 1 ? "w-1/2" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-12 w-12 rounded-full", className)} {...props} />;
}

export { Skeleton };
