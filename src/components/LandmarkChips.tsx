import { MapPin, Landmark, Hospital, GraduationCap, Fuel, Store, Banknote, Building2 } from 'lucide-react';
import { type Landmark as LandmarkType, getCategoryIcon, formatDistance } from '@/hooks/useLandmarks';
import { cn } from '@/lib/utils';

interface LandmarkChipsProps {
  landmarks: LandmarkType[];
  onSelect: (landmark: LandmarkType) => void;
  selectedName?: string;
  loading?: boolean;
  maxChips?: number;
  className?: string;
}

const iconMap = {
  landmark: Landmark,
  hospital: Hospital,
  school: GraduationCap,
  fuel: Fuel,
  market: Store,
  bank: Banknote,
  building: Building2,
  pin: MapPin,
};

export function LandmarkChips({
  landmarks,
  onSelect,
  selectedName,
  loading = false,
  maxChips = 8,
  className,
}: LandmarkChipsProps) {
  if (loading) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 bg-secondary animate-pulse rounded-full"
          />
        ))}
      </div>
    );
  }

  if (landmarks.length === 0) {
    return null;
  }

  const displayLandmarks = landmarks.slice(0, maxChips);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {displayLandmarks.map((landmark) => {
        const iconType = getCategoryIcon(landmark.category);
        const Icon = iconMap[iconType];
        const isSelected = selectedName === landmark.name;

        return (
          <button
            key={landmark.id}
            onClick={() => onSelect(landmark)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
              "border hover:shadow-sm",
              isSelected
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-secondary/50 text-foreground border-border hover:border-accent/50 hover:bg-secondary"
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[120px]">{landmark.name}</span>
            {landmark.distance !== undefined && (
              <span className="text-xs opacity-70">
                {formatDistance(landmark.distance)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default LandmarkChips;
