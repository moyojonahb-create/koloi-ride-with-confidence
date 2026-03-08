import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { DollarSign, TrendingUp, Car, Calendar } from 'lucide-react';
import { format, subDays, startOfDay, startOfWeek, eachDayOfInterval } from 'date-fns';

interface EarningsData {
  date: string;
  earnings: number;
  trips: number;
}

const chartConfig = {
  earnings: { label: 'Earnings', color: 'hsl(var(--primary))' },
  trips: { label: 'Trips', color: 'hsl(var(--accent-foreground))' },
};

export default function DriverEarningsDashboard() {
  const { user } = useAuth();
  const [rides, setRides] = useState<{ fare: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const since = subDays(new Date(), period === '7d' ? 7 : 30).toISOString();

      // Get driver_id first
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!driver) { setLoading(false); return; }

      const { data } = await supabase
        .from('rides')
        .select('fare, created_at')
        .eq('driver_id', driver.id)
        .eq('status', 'completed')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      setRides(data || []);
      setLoading(false);
    };
    load();
  }, [user, period]);

  const days = period === '7d' ? 7 : 30;

  const dailyData: EarningsData[] = useMemo(() => {
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date(),
    });

    return interval.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayRides = rides.filter(
        (r) => format(new Date(r.created_at), 'yyyy-MM-dd') === dayStr
      );
      return {
        date: format(day, period === '7d' ? 'EEE' : 'dd MMM'),
        earnings: dayRides.reduce((sum, r) => sum + Number(r.fare), 0),
        trips: dayRides.length,
      };
    });
  }, [rides, days, period]);

  const totals = useMemo(() => {
    const totalEarnings = rides.reduce((s, r) => s + Number(r.fare), 0);
    const totalTrips = rides.length;
    const avgPerTrip = totalTrips > 0 ? totalEarnings / totalTrips : 0;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayEarnings = rides
      .filter((r) => format(new Date(r.created_at), 'yyyy-MM-dd') === todayStr)
      .reduce((s, r) => s + Number(r.fare), 0);
    return { totalEarnings, totalTrips, avgPerTrip, todayEarnings };
  }, [rides]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">Loading earnings…</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Earnings Dashboard
          </h3>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as '7d' | '30d')}>
            <TabsList className="h-8">
              <TabsTrigger value="7d" className="text-xs px-3 h-6">7 Days</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-3 h-6">30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-primary/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground font-medium">Today</span>
            </div>
            <p className="text-lg font-extrabold tabular-nums">${totals.todayEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground font-medium">{period === '7d' ? 'This Week' : 'This Month'}</span>
            </div>
            <p className="text-lg font-extrabold tabular-nums">${totals.totalEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Car className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">Total Trips</span>
            </div>
            <p className="text-lg font-extrabold tabular-nums">{totals.totalTrips}</p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">Avg / Trip</span>
            </div>
            <p className="text-lg font-extrabold tabular-nums">${totals.avgPerTrip.toFixed(2)}</p>
          </div>
        </div>

        {/* Earnings Bar Chart */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Earnings ($)</p>
          <ChartContainer config={chartConfig} className="h-40 w-full">
            <BarChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Trip Count Line Chart */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Trips per day</p>
          <ChartContainer config={chartConfig} className="h-32 w-full">
            <LineChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="trips" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
