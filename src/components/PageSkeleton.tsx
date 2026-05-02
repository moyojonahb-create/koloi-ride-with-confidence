import { Skeleton, SkeletonAvatar, SkeletonBox, SkeletonText } from "@/components/ui/skeleton";

/**
 * Route-level skeleton shells — used as Suspense fallbacks so the user
 * NEVER sees a blank screen or a centred spinner. Each variant mirrors
 * the rough layout of the page that's about to mount, then fades out
 * naturally as the real component takes over.
 */

interface Props {
  variant?: "ride" | "wallet" | "profile" | "admin" | "generic";
}

export default function PageSkeleton({ variant = "generic" }: Props) {
  if (variant === "ride") return <RideSkeleton />;
  if (variant === "wallet") return <WalletSkeleton />;
  if (variant === "profile") return <ProfileSkeleton />;
  if (variant === "admin") return <AdminSkeleton />;
  return <GenericSkeleton />;
}

function GenericSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background animate-in fade-in duration-200">
      <div className="px-4 pt-6 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-7 w-48 rounded" />
        <SkeletonText lines={3} />
        <SkeletonBox className="h-32" />
        <SkeletonBox className="h-24" />
      </div>
    </div>
  );
}

function RideSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background relative animate-in fade-in duration-200">
      {/* Map placeholder — full viewport, light tile */}
      <div className="absolute inset-0">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      {/* Bottom sheet skeleton */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl p-4 space-y-3 shadow-2xl">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
        <SkeletonBox className="h-12" />
        <SkeletonBox className="h-12" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <SkeletonAvatar className="h-10 w-10" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/2 rounded" />
                <Skeleton className="h-2.5 w-1/3 rounded" />
              </div>
              <Skeleton className="h-4 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background animate-in fade-in duration-200">
      <div className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-5 w-28 rounded" />
        </div>
        {/* Wallet card */}
        <Skeleton className="h-44 w-full rounded-2xl" />
        {/* Action row */}
        <div className="grid grid-cols-3 gap-2">
          <SkeletonBox />
          <SkeletonBox />
          <SkeletonBox />
        </div>
        {/* Transactions */}
        <div className="space-y-2 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
              <SkeletonAvatar className="h-8 w-8" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3 rounded" />
                <Skeleton className="h-2.5 w-1/3 rounded" />
              </div>
              <Skeleton className="h-3 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background animate-in fade-in duration-200">
      {/* gradient header band */}
      <div className="px-4 pt-12 pb-6 bg-muted/40">
        <div className="flex items-center gap-4">
          <SkeletonAvatar className="h-16 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-3 w-40 rounded" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} className="h-16" />
          ))}
        </div>
        <SkeletonBox className="h-20" />
        <SkeletonBox className="h-14" />
        <SkeletonBox className="h-14" />
        <SkeletonBox className="h-14" />
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background animate-in fade-in duration-200">
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} className="h-24" />
          ))}
        </div>
        <SkeletonBox className="h-64" />
      </div>
    </div>
  );
}
