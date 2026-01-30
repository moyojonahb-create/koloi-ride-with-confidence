import { cn } from '@/lib/utils';
import { MapPin, Building2, Stethoscope, ShoppingBag, Shield, Fuel, School } from 'lucide-react';

interface QuickPick {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon: 'rank' | 'cbd' | 'hospital' | 'shopping' | 'police' | 'fuel' | 'school';
}

// Gwanda quick picks
const GWANDA_QUICK_PICKS: QuickPick[] = [
  { id: 'rank', name: 'Gwanda Rank', lat: -20.9380, lng: 29.0120, icon: 'rank' },
  { id: 'cbd', name: 'CBD', lat: -20.9355, lng: 29.0147, icon: 'cbd' },
  { id: 'hospital', name: 'Hospital', lat: -20.9410, lng: 29.0180, icon: 'hospital' },
  { id: 'shopping', name: 'Shopping Centre', lat: -20.9365, lng: 29.0135, icon: 'shopping' },
  { id: 'police', name: 'Police Station', lat: -20.9345, lng: 29.0155, icon: 'police' },
];

const ICON_MAP = {
  rank: MapPin,
  cbd: Building2,
  hospital: Stethoscope,
  shopping: ShoppingBag,
  police: Shield,
  fuel: Fuel,
  school: School,
};

interface QuickPickChipsProps {
  onSelect: (pick: { name: string; lat: number; lng: number }) => void;
  selectedName?: string;
  className?: string;
}

export default function QuickPickChips({ onSelect, selectedName, className }: QuickPickChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {GWANDA_QUICK_PICKS.map((pick) => {
        const Icon = ICON_MAP[pick.icon];
        const isSelected = selectedName === pick.name;

        return (
          <button
            key={pick.id}
            onClick={() => onSelect({ name: pick.name, lat: pick.lat, lng: pick.lng })}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all',
              'border min-h-[44px]', // Thumb-friendly
              isSelected
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-secondary/50 text-foreground border-border hover:border-accent/50 hover:bg-secondary'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{pick.name}</span>
          </button>
        );
      })}
    </div>
  );
}
