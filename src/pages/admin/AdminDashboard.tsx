import { useEffect, useState, useCallback, useMemo } from 'react';
import { RefreshCw, Wallet, Car, Navigation, Users, MapPin, TrendingUp, Clock, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminMap from '@/components/admin/AdminMap';
import { useAdminEarnings } from '@/hooks/useWallet';
import AdminEarningsSheet from '@/components/wallet/AdminEarningsSheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface DriverRow {
  id: string;
  user_id: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  plate_number: string | null;
  status: string;
  is_online: boolean | null;
  profile?: {
    full_name: string | null;
    phone: string | null;
  };
  location?: {
    latitude: number;
    longitude: number;
    updated_at: string;
  } | null;
}

interface RideRow {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  fare: number;
  status: string;
  created_at: string;
  driver_id: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  accepted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  expired: 'bg-muted text-muted-foreground border-border',
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDrivers, setPendingDrivers] = useState<DriverRow[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<DriverRow[]>([]);
  const [latestRides, setLatestRides] = useState<RideRow[]>([]);
  const [activeRides, setActiveRides] = useState<RideRow[]>([]);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [earningsSheetOpen, setEarningsSheetOpen] = useState(false);

  const { earnings, totalEarnings, totalPlatformFees, refresh: refreshEarnings } = useAdminEarnings();

  const refreshAll = useCallback(async () => {
    setError('');
    try {
      // Pending drivers
      const { data: pending, error: pendingErr } = await supabase
        .from('drivers')
        .select('id, user_id, vehicle_make, vehicle_model, plate_number, status, is_online')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);
      if (pendingErr) throw pendingErr;

      const pendingWithProfiles = await Promise.all(
        (pending || []).map(async (driver) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('user_id', driver.user_id)
            .single();
          return { ...driver, profile: profile || undefined };
        })
      );

      // Online approved drivers
      const { data: online, error: onlineErr } = await supabase
        .from('drivers')
        .select('id, user_id, vehicle_make, vehicle_model, plate_number, status, is_online')
        .eq('status', 'approved')
        .eq('is_online', true)
        .limit(100);
      if (onlineErr) throw onlineErr;

      const onlineWithDetails = await Promise.all(
        (online || []).map(async (driver) => {
          const [profileRes, locationRes] = await Promise.all([
            supabase.from('profiles').select('full_name, phone').eq('user_id', driver.user_id).single(),
            supabase.from('live_locations').select('latitude, longitude, updated_at').eq('user_id', driver.user_id).single()
          ]);
          return { ...driver, profile: profileRes.data || undefined, location: locationRes.data || null };
        })
      );

      // Total approved drivers
      const { count: driverCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Today's trips
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      // Latest rides
      const { data: rides, error: ridesErr } = await supabase
        .from('rides')
        .select('id, pickup_address, dropoff_address, fare, status, created_at, driver_id')
        .order('created_at', { ascending: false })
        .limit(60);
      if (ridesErr) throw ridesErr;

      // Active rides (for map)
      const { data: active } = await supabase
        .from('rides')
        .select('id, pickup_address, dropoff_address, pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, fare, status, created_at, driver_id')
        .in('status', ['pending', 'requested', 'accepted', 'in_progress', 'arrived'])
        .limit(50);

      setPendingDrivers(pendingWithProfiles);
      setOnlineDrivers(onlineWithDetails);
      setLatestRides(rides || []);
      setActiveRides(active || []);
      setTotalDrivers(driverCount || 0);
      setTodayTrips(todayCount || 0);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 10000);

    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, () => refreshAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => refreshAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => refreshAll())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [refreshAll]);

  const setDriverStatus = async (driverId: string, status: 'approved' | 'suspended') => {
    setError('');
    const { error: updateErr } = await supabase.from('drivers').update({ status }).eq('id', driverId);
    if (updateErr) { setError(updateErr.message); return; }

    await supabase.from('system_events').insert({
      event_type: status === 'approved' ? 'driver_approved' : 'driver_suspended',
      entity_type: 'driver',
      entity_id: driverId,
      details: { status }
    });
    await refreshAll();
  };

  const forceDriverOffline = async (userId: string, driverId: string) => {
    await supabase.from('drivers').update({ is_online: false }).eq('id', driverId);
    await supabase.from('live_locations').update({ is_online: false }).eq('user_id', userId);
    await supabase.from('system_events').insert({
      event_type: 'force_driver_offline',
      entity_type: 'driver',
      entity_id: driverId,
    });
    await refreshAll();
  };

  const mapDrivers = useMemo(() => 
    onlineDrivers
      .filter(d => d.location?.latitude && d.location?.longitude)
      .map(d => ({
        id: d.id,
        name: d.profile?.full_name || 'Driver',
        lat: d.location!.latitude,
        lng: d.location!.longitude,
        isOnline: true,
      }))
  , [onlineDrivers]);

  const mapRides = useMemo(() => 
    activeRides.map(r => ({
      id: r.id,
      pickupLat: (r as unknown as Record<string, unknown>).pickup_lat as number,
      pickupLng: (r as unknown as Record<string, unknown>).pickup_lon as number,
      dropoffLat: (r as unknown as Record<string, unknown>).dropoff_lat as number,
      dropoffLng: (r as unknown as Record<string, unknown>).dropoff_lon as number,
      status: r.status,
      pickupAddress: r.pickup_address,
      dropoffAddress: r.dropoff_address,
    }))
  , [activeRides]);

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Live operations overview</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                size="sm"
                className="font-bold"
                onClick={() => setEarningsSheetOpen(true)}
              >
                <Wallet className="w-4 h-4 mr-2" />
                R{totalPlatformFees.toFixed(2)}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { refreshAll(); refreshEarnings(); }} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 font-bold text-sm">
              {error}
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Navigation className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">{todayTrips}</p>
                    <p className="text-xs text-muted-foreground">Today's Rides</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <Car className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">{onlineDrivers.length}</p>
                    <p className="text-xs text-muted-foreground">Online Now</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">{pendingDrivers.length}</p>
                    <p className="text-xs text-muted-foreground">Pending Approval</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground">{totalDrivers}</p>
                    <p className="text-xs text-muted-foreground">Total Drivers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Map */}
          <Card>
            <CardContent className="pt-4">
              <h2 className="font-bold text-sm mb-3">Live Map — Drivers & Active Rides</h2>
              <AdminMap 
                drivers={mapDrivers} 
                rides={mapRides} 
                height="420px"
              />
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pending Approvals */}
            <Card>
              <CardContent className="pt-4">
                <h2 className="font-bold text-sm mb-3">Pending Driver Approvals</h2>
                {pendingDrivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No pending drivers</p>
                ) : (
                  <div className="space-y-3">
                    {pendingDrivers.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-xl">
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{d.profile?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.profile?.phone || '—'} • {d.vehicle_make} {d.vehicle_model}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="default" className="h-8 text-xs font-bold" onClick={() => setDriverStatus(d.id, 'approved')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="h-8 text-xs font-bold" onClick={() => setDriverStatus(d.id, 'suspended')}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Tracking */}
            <Card>
              <CardContent className="pt-4">
                <h2 className="font-bold text-sm mb-3">Online Drivers</h2>
                {onlineDrivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No drivers online</p>
                ) : (
                  <div className="space-y-3">
                    {onlineDrivers.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-xl">
                        <div className="min-w-0">
                          <p className="font-bold text-sm">{d.profile?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.location?.latitude && d.location?.longitude
                              ? `${d.location.latitude.toFixed(4)}, ${d.location.longitude.toFixed(4)}`
                              : 'No GPS'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {d.location?.updated_at ? new Date(d.location.updated_at).toLocaleTimeString() : '—'}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate(`/admin/drivers/${d.id}`)}>
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="secondary" className="h-8 text-xs font-bold" onClick={() => forceDriverOffline(d.user_id, d.id)}>
                            Force Offline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ride Monitoring */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm">Ride Monitoring</h2>
                <Button size="sm" variant="ghost" onClick={() => navigate('/admin/trips')}>View All</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-bold text-xs text-muted-foreground">Time</th>
                      <th className="text-left py-2 px-2 font-bold text-xs text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-2 font-bold text-xs text-muted-foreground">Pickup</th>
                      <th className="text-left py-2 px-2 font-bold text-xs text-muted-foreground">Dropoff</th>
                      <th className="text-left py-2 px-2 font-bold text-xs text-muted-foreground">Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestRides.slice(0, 20).map((r) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className={`text-[10px] font-bold ${statusColors[r.status] || ''}`}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-xs max-w-[150px] truncate">{r.pickup_address || '—'}</td>
                        <td className="py-2 px-2 text-xs max-w-[150px] truncate">{r.dropoff_address || '—'}</td>
                        <td className="py-2 px-2 text-xs font-bold">R{Number(r.fare).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Earnings Sheet */}
          <AdminEarningsSheet
            isOpen={earningsSheetOpen}
            onClose={() => setEarningsSheetOpen(false)}
            earnings={earnings}
            totalFares={totalEarnings}
            totalPlatformFees={totalPlatformFees}
          />
        </div>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminDashboard;
