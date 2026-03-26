import { Volume2, Thermometer, Accessibility, Ear, ShieldCheck } from 'lucide-react';

interface RidePreferenceTagsProps {
  quietRide?: boolean;
  coolTemperature?: boolean;
  wavRequired?: boolean;
  hearingImpaired?: boolean;
  genderPreference?: string;
}

export default function RidePreferenceTags({ quietRide, coolTemperature, wavRequired, hearingImpaired, genderPreference }: RidePreferenceTagsProps) {
  const hasAny = quietRide || coolTemperature || wavRequired || hearingImpaired || (genderPreference && genderPreference !== 'any');
  if (!hasAny) return null;
  
  return (
    <div className="flex flex-wrap gap-1.5">
      {quietRide && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
          <Volume2 className="w-3 h-3" /> Quiet Ride
        </span>
      )}
      {coolTemperature && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
          <Thermometer className="w-3 h-3" /> Cool Temp
        </span>
      )}
      {wavRequired && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-semibold">
          <Accessibility className="w-3 h-3" /> WAV Required
        </span>
      )}
      {hearingImpaired && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-semibold">
          <Ear className="w-3 h-3" /> Hearing Impaired
        </span>
      )}
      {genderPreference === 'female_only' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-100 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 text-[11px] font-semibold">
          <ShieldCheck className="w-3 h-3" /> Women Only
        </span>
      )}
    </div>
  );
}
