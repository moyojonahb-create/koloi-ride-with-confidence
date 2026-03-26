import { Accessibility, Ear } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccessibilityFiltersProps {
  wavRequired: boolean;
  hearingImpaired: boolean;
  onWavChange: (v: boolean) => void;
  onHearingChange: (v: boolean) => void;
}

export default function AccessibilityFilters({ wavRequired, hearingImpaired, onWavChange, onHearingChange }: AccessibilityFiltersProps) {
  return (
    <div className="glass-card rounded-2xl px-3 py-2 space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Accessibility</p>
      <FilterRow
        icon={<Accessibility className="w-3.5 h-3.5" />}
        label="Wheelchair Accessible"
        subtitle="Only WAV vehicles"
        active={wavRequired}
        onChange={onWavChange}
      />
      <FilterRow
        icon={<Ear className="w-3.5 h-3.5" />}
        label="Hearing Impaired"
        subtitle="Visual notifications only"
        active={hearingImpaired}
        onChange={onHearingChange}
      />
    </div>
  );
}

function FilterRow({ icon, label, subtitle, active, onChange }: {
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
