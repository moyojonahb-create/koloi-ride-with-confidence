import { useEffect, useState } from 'react';
import { 
  Car, 
  Users, 
  Navigation, 
  CheckCircle, 
  XCircle, 
  Clock,
  Banknote,
  Activity
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import MetricCard from '@/components/admin/MetricCard';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardMetrics {
  totalDrivers: number;
  activeDrivers: number;
  pendingDrivers: number;
  totalTripsToday: number;
  ongoingTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalRevenue: number;
}

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch driver stats
        const { count: totalDrivers } = await supabase
          .from('drivers')
          .select('*', { count: 'exact', head: true });

        const { count: activeDrivers } = await supabase
          .from('drivers')
          .select('*', { count: 'exact', head: true })
          .eq('is_online', true)
          .eq('status', 'approved');

        const { count: pendingDrivers } = await supabase
          .from('drivers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch trip stats for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: tripsToday } = await supabase
          .from('rides')
          .select('status, fare')
          .gte('created_at', today.toISOString());

        const tripStats = {
          total: tripsToday?.length || 0,
          ongoing: tripsToday?.filter(t => t.status === 'requested' || t.status === 'in_progress').length || 0,
          completed: tripsToday?.filter(t => t.status === 'completed').length || 0,
          cancelled: tripsToday?.filter(t => t.status === 'cancelled').length || 0,
          revenue: tripsToday?.filter(t => t.status === 'completed').reduce((sum, t) => sum + Number(t.fare), 0) || 0,
        };

        setMetrics({
          totalDrivers: totalDrivers || 0,
          activeDrivers: activeDrivers || 0,
          pendingDrivers: pendingDrivers || 0,
          totalTripsToday: tripStats.total,
          ongoingTrips: tripStats.ongoing,
          completedTrips: tripStats.completed,
          cancelledTrips: tripStats.cancelled,
          totalRevenue: tripStats.revenue,
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Subscribe to realtime updates for live_locations
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, () => {
        fetchMetrics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        fetchMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Real-time overview of Koloi operations</p>
          </div>

          {/* System Status */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              All systems operational
            </span>
          </div>

          {/* Metrics Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Drivers"
                value={metrics.totalDrivers}
                icon={Car}
                subtitle={`${metrics.pendingDrivers} pending approval`}
              />
              <MetricCard
                title="Active Drivers"
                value={metrics.activeDrivers}
                icon={Users}
                variant="success"
                subtitle="Online now"
              />
              <MetricCard
                title="Trips Today"
                value={metrics.totalTripsToday}
                icon={Navigation}
              />
              <MetricCard
                title="Ongoing Trips"
                value={metrics.ongoingTrips}
                icon={Clock}
                variant="warning"
                subtitle="In progress"
              />
              <MetricCard
                title="Completed Trips"
                value={metrics.completedTrips}
                icon={CheckCircle}
                variant="success"
              />
              <MetricCard
                title="Cancelled Trips"
                value={metrics.cancelledTrips}
                icon={XCircle}
                variant="danger"
              />
              <MetricCard
                title="Revenue Today"
                value={`R${metrics.totalRevenue.toLocaleString()}`}
                icon={Banknote}
                variant="success"
              />
              <MetricCard
                title="Pending Drivers"
                value={metrics.pendingDrivers}
                icon={Clock}
                variant="warning"
                subtitle="Awaiting verification"
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Failed to load metrics
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-muted-foreground">System started monitoring</span>
                  <span className="ml-auto text-xs text-muted-foreground">Just now</span>
                </div>
                <p className="text-sm text-muted-foreground text-center py-4">
                  Activity feed will populate as events occur
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Driver Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span className="text-sm">Online & Approved</span>
                  </div>
                  <span className="font-medium">{metrics?.activeDrivers || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                    <span className="text-sm">Pending Approval</span>
                  </div>
                  <span className="font-medium">{metrics?.pendingDrivers || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <span className="text-sm">Offline</span>
                  </div>
                  <span className="font-medium">
                    {(metrics?.totalDrivers || 0) - (metrics?.activeDrivers || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminDashboard;
