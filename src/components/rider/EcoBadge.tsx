import { useEffect, useState } from 'react';
import { Leaf, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function EcoBadge() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ co2Saved: number; sharedRides: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('eco_stats')
      .select('total_co2_saved_kg, shared_rides_count')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStats({ co2Saved: data.total_co2_saved_kg, sharedRides: data.shared_rides_count });
        }
      });
  }, [user]);

  if (!stats || (stats.co2Saved === 0 && stats.sharedRides === 0)) return null;

  return (
    <section className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center">
          <Leaf className="w-4 h-4 text-green-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Eco Impact</h3>
          <p className="text-[10px] text-muted-foreground">Your green travel stats</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-500/5 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-green-600 dark:text-green-400 tabular-nums">
            {stats.co2Saved.toFixed(1)}<span className="text-xs font-medium ml-0.5">kg</span>
          </p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">CO₂ Saved</p>
        </div>
        <div className="bg-green-500/5 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-green-600 dark:text-green-400 tabular-nums">{stats.sharedRides}</p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Eco Rides</p>
        </div>
      </div>
    </section>
  );
}
