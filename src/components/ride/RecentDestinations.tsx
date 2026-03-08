import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Home, Briefcase } from 'lucide-react';

interface RecentDestination {
  name: string;
  lat: number;
  lng: number;
  count: number;
}

interface RecentDestinationsProps {
  onSelect: (dest: { name: string; lat: number; lng: number }) => void;
  field: 'pickup' | 'dropoff';
}

export default function RecentDestinations({ onSelect, field }: RecentDestinationsProps) {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<RecentDestination[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchRecent();
  }, [user]);

  const fetchRecent = async () => {
    const col = field === 'pickup' ? 'pickup' : 'dropoff';
    const { data } = await supabase
      .from('rides')
      .select(`${col}_address, ${col}_lat, ${col}_lon`)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data) return;

    // Deduplicate by name and count frequency
    const map = new Map<string, RecentDestination>();
    for (const row of data) {
      const name = (row as any)[`${col}_address`];
      const lat = (row as any)[`${col}_lat`];
      const lng = (row as any)[`${col}_lon`];
      if (!name) continue;
      const existing = map.get(name);
      if (existing) {
        existing.count++;
      } else {
        map.set(name, { name, lat, lng, count: 1 });
      }
    }

    // Sort by frequency, take top 5
    setDestinations(
      Array.from(map.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );
  };

  if (destinations.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">
        Recent
      </p>
      {destinations.map((dest, i) => (
        <button
          key={`${dest.name}-${i}`}
          onClick={() => onSelect(dest)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{dest.name}</p>
            {dest.count > 1 && (
              <p className="text-[11px] text-muted-foreground">{dest.count} trips</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
