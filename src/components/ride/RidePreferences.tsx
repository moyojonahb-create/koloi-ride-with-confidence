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
    <div className="glass-card rounded-2xl p-3 space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Ride Preferences</p>
      <ToggleRow
        icon={<Volume2 className="w-4 h-4" />}
        label="Quiet Ride"
        subtitle="I prefer to ride in silence"
        active={quietRide}
        onChange={onQuietChange}
      />
      <ToggleRow
        icon={<Thermometer className="w-4 h-4" />}
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
      className="w-full flex items-center gap-3 py-2 px-1 rounded-xl active:scale-[0.98] transition-all"
    >
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-colors', active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className={cn('h-6 w-11 rounded-full transition-colors flex items-center', active ? 'bg-primary' : 'bg-muted')}>
        <span className={cn('block h-5 w-5 rounded-full bg-white shadow-sm transition-transform', active ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </div>
    </button>
  );
}
