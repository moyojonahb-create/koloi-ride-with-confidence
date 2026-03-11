import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Star, MapPin } from 'lucide-react';

interface RecentDestination {
  name: string;
  lat: number;
  lng: number;
  count: number;
}

interface FavoriteLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  icon: string | null;
}

interface RecentDestinationsProps {
  onSelect: (dest: { name: string; lat: number; lng: number }) => void;
  field: 'pickup' | 'dropoff';
}

export default function RecentDestinations({ onSelect, field }: RecentDestinationsProps) {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<RecentDestination[]>([]);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchRecent();
    fetchFavorites();
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

    setDestinations(
      Array.from(map.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );
  };

  const fetchFavorites = async () => {
    const { data } = await supabase
      .from('favorite_locations')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setFavorites(data);
  };

  const hasFavorites = favorites.length > 0;
  const hasRecent = destinations.length > 0;

  if (!hasFavorites && !hasRecent) return null;

  return (
    <div className="space-y-4">
      {/* Saved Places */}
      {hasFavorites && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2 flex items-center gap-1.5">
            <Star className="w-3 h-3" /> Saved Places
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <AnimatePresence>
              {favorites.map((fav, i) => (
                <motion.button
                  key={fav.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onSelect({ name: fav.name, lat: fav.latitude, lng: fav.longitude })}
                  className="shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-2xl glass-card active:scale-[0.96] transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 text-accent-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground whitespace-nowrap">{fav.name}</p>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Recent Destinations */}
      {hasRecent && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Recent
          </p>
          <AnimatePresence>
            {destinations.map((dest, i) => (
              <motion.button
                key={`${dest.name}-${i}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
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
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
