import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Volume2, Thermometer, Accessibility, Ear, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type RiderPreferences = {
  quiet_ride: boolean;
  cool_temperature: boolean;
  wav_required: boolean;
  hearing_impaired: boolean;
  gender_preference: string;
  gender: string | null;
};

const defaults: RiderPreferences = {
  quiet_ride: false,
  cool_temperature: false,
  wav_required: false,
  hearing_impaired: false,
  gender_preference: 'any',
  gender: null,
};

export function useRiderPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<RiderPreferences>(defaults);
  const [loaded, setLoaded] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('quiet_ride, cool_temperature, wav_required, hearing_impaired, gender_preference, gender')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setPrefs(data as RiderPreferences);
    setLoaded(true);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { prefs, loaded, refetch: fetch };
}

export default function RiderPreferencesSettings() {
  const { user } = useAuth();
  const { prefs, loaded } = useRiderPreferences();
  const [local, setLocal] = useState<RiderPreferences>(defaults);

  useEffect(() => { if (loaded) setLocal(prefs); }, [prefs, loaded]);

  const update = async (field: keyof RiderPreferences, value: boolean | string) => {
    if (!user) return;
    const next = { ...local, [field]: value };
    setLocal(next);
    const { error } = await supabase
      .from('profiles')
      .update({
        quiet_ride: next.quiet_ride,
        cool_temperature: next.cool_temperature,
        wav_required: next.wav_required,
        hearing_impaired: next.hearing_impaired,
        gender_preference: next.gender_preference,
      } as never)
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to save preference');
      setLocal(local);
    }
  };

  if (!loaded) return null;

  const ITEMS = [
    { key: 'quiet_ride' as const, icon: Volume2, label: 'Quiet Ride', desc: 'I prefer to ride in silence', color: 'text-primary' },
    { key: 'cool_temperature' as const, icon: Thermometer, label: 'Cool Temperature', desc: 'Keep the AC on please', color: 'text-sky-500' },
    { key: 'wav_required' as const, icon: Accessibility, label: 'Wheelchair Accessible', desc: 'Only WAV vehicles', color: 'text-amber-500' },
    { key: 'hearing_impaired' as const, icon: Ear, label: 'Hearing Impaired', desc: 'Visual notifications only', color: 'text-purple-500' },
  ];

  const isWomenOnly = local.gender_preference === 'female';
  const isFemaleRider = local.gender === 'female';

  return (
    <div className="space-y-1.5">
      {ITEMS.map(({ key, icon: Icon, label, desc, color }) => (
        <div key={key} className="w-full flex items-center gap-3 px-4 py-3 glass-card rounded-2xl">
          <Icon className={cn('w-4 h-4', color)} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground">{desc}</p>
          </div>
          <Switch
            checked={local[key]}
            onCheckedChange={(v) => update(key, v)}
          />
        </div>
      ))}
      {/* Gender preference — only visible to female riders */}
      {isFemaleRider && (
        <div className="w-full flex items-center gap-3 px-4 py-3 glass-card rounded-2xl">
          <ShieldCheck className="w-4 h-4 text-pink-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Women Only Drivers</p>
            <p className="text-[10px] text-muted-foreground">Only matched with female drivers for added safety</p>
          </div>
          <Switch
            checked={isWomenOnly}
            onCheckedChange={(v) => update('gender_preference', v ? 'female' : 'any')}
          />
        </div>
      )}
    </div>
  );
}
