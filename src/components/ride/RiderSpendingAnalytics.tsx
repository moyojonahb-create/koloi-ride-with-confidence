import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, DollarSign, MapPin, Car } from 'lucide-react';
import { format, subDays, isSameDay, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { motion } from 'framer-motion';

interface RideRecord {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  fare: number;
  distance_km: number;
  duration_minutes: number;
  status: string;
  created_at: string;
}

interface Props {
  rides: RideRecord[];
}

export default function RiderSpendingAnalytics({ rides }: Props) {
  const completedRides = useMemo(() => rides.filter((r) => r.status === 'completed'), [rides]);

  const stats = useMemo(() => {
    const total = completedRides.reduce((s, r) => s + Number(r.fare), 0);
    const avg = completedRides.length ? total / completedRides.length : 0;

    // Top route
    const routeMap: Record<string, number> = {};
    completedRides.forEach((r) => {
      const key = `${r.pickup_address.split(',')[0]} → ${r.dropoff_address.split(',')[0]}`;
      routeMap[key] = (routeMap[key] || 0) + 1;
    });
    const topRoute = Object.entries(routeMap).sort((a, b) => b[1] - a[1])[0];

    return { total, avg, count: completedRides.length, topRoute: topRoute?.[0] || '—' };
  }, [completedRides]);

  const dailyData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    return days.map((day) => {
      const dayRides = completedRides.filter((r) => isSameDay(new Date(r.created_at), day));
      return {
        date: format(day, 'EEE'),
        amount: dayRides.reduce((s, r) => s + Number(r.fare), 0),
        trips: dayRides.length,
      };
    });
  }, [completedRides]);

  const statCards = [
    { icon: DollarSign, label: 'Total Spent', value: `$${stats.total.toFixed(2)}`, color: 'text-primary' },
    { icon: TrendingUp, label: 'Avg/Trip', value: `$${stats.avg.toFixed(2)}`, color: 'text-accent-foreground' },
    { icon: Car, label: 'Total Trips', value: String(stats.count), color: 'text-primary' },
  ];

  if (completedRides.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 px-1">
        <TrendingUp className="w-4 h-4 text-primary" />
        Spending Trends
      </h3>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-3 text-center"
            style={{ borderRadius: 14 }}
          >
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Top route */}
      {stats.topRoute !== '—' && (
        <div className="glass-card p-3 flex items-center gap-2" style={{ borderRadius: 14 }}>
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium">Most Frequent Route</p>
            <p className="text-xs font-semibold text-foreground truncate">{stats.topRoute}</p>
          </div>
        </div>
      )}

      {/* 7-day chart */}
      <div className="glass-card p-4" style={{ borderRadius: 14 }}>
        <p className="text-xs font-semibold text-muted-foreground mb-3">Last 7 Days</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} width={35} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
            />
            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
