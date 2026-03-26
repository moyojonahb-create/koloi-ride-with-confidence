import { Volume2, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RidePreferencesProps {
  quietRide: boolean;
  coolTemp: boolean;
  onQuietChange: (v: boolean) => void;
  onCoolChange: (v: boolean) => void;
}

export default function RidePreferences({ quietRide, coolTemp, onQuietChange, onCoolChange }: RidePreferencesProps) {
  return (
    <div className="glass-card rounded-2xl px-3 py-2 space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Ride Preferences</p>
      <ToggleRow
        icon={<Volume2 className="w-3.5 h-3.5" />}
        label="Quiet Ride"
        subtitle="I prefer to ride in silence"
        active={quietRide}
        onChange={onQuietChange}
      />
      <ToggleRow
        icon={<Thermometer className="w-3.5 h-3.5" />}
        label="Cool Temperature"
        subtitle="Keep the AC on please"
        active={coolTemp}
        onChange={onCoolChange}
      />
    </div>
  );
}

function ToggleRow({ icon, label, subtitle, active, onChange }: {
  icon: React.ReactNode; label: string; subtitle: string; active: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      className="w-full flex items-center gap-2 py-1.5 rounded-xl active:scale-[0.98] transition-all"
    >
      <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center transition-colors', active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-xs font-medium text-foreground leading-tight">{label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>
      </div>
      <div className={cn('h-5 w-9 rounded-full transition-colors flex items-center', active ? 'bg-primary' : 'bg-muted')}>
        <span className={cn('block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', active ? 'translate-x-[16px]' : 'translate-x-0.5')} />
      </div>
    </button>
  );
}
