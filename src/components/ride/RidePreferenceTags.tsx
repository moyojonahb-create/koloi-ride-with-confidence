import { Volume2, Thermometer } from 'lucide-react';

interface RidePreferenceTagsProps {
  quietRide?: boolean;
  coolTemperature?: boolean;
}

export default function RidePreferenceTags({ quietRide, coolTemperature }: RidePreferenceTagsProps) {
  if (!quietRide && !coolTemperature) return null;
  
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
    </div>
  );
}
