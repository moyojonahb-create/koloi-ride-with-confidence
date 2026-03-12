import { Shield, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFemaleTheme } from '@/hooks/useFemaleTheme';

export type GenderPreference = 'any' | 'female_only';

interface GenderPreferenceToggleProps {
  value: GenderPreference;
  onChange: (value: GenderPreference) => void;
}

export default function GenderPreferenceToggle({ value, onChange }: GenderPreferenceToggleProps) {
  const isFemaleOnly = value === 'female_only';
  const { setFemaleMode } = useFemaleTheme();

  const handleToggle = () => {
    const next = isFemaleOnly ? 'any' : 'female_only';
    onChange(next);
    setFemaleMode(next === 'female_only');
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left w-full",
        isFemaleOnly
          ? "border-pink-400 bg-pink-50 dark:bg-pink-950/20"
          : "border-border hover:border-muted-foreground/30"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
        isFemaleOnly ? "bg-pink-400 text-white" : "bg-secondary text-muted-foreground"
      )}>
        {isFemaleOnly ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-semibold",
          isFemaleOnly ? "text-pink-600 dark:text-pink-400" : "text-foreground"
        )}>
          {isFemaleOnly ? 'Women-Only Ride' : 'Any Driver'}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {isFemaleOnly ? 'Only matched with female drivers' : 'Tap to request a female driver only'}
        </p>
      </div>
      <div className={cn(
        "w-10 h-6 rounded-full transition-colors relative shrink-0",
        isFemaleOnly ? "bg-pink-400" : "bg-muted"
      )}>
        <div className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
          isFemaleOnly ? "translate-x-[18px]" : "translate-x-0.5"
        )} />
      </div>
    </button>
  );
}
