import { useEffect, useState, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminMap from '@/components/admin/AdminMap';

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

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDrivers, setPendingDrivers] = useState<DriverRow[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<DriverRow[]>([]);
  const [latestRides, setLatestRides] = useState<RideRow[]>([]);
  const [activeRides, setActiveRides] = useState<RideRow[]>([]);

  const refreshAll = useCallback(async () => {
    setError('');
    try {
      // Pending drivers
      const { data: pending, error: pendingErr } = await supabase
        .from('drivers')
        .select(`
          id, user_id, vehicle_make, vehicle_model, plate_number, status, is_online
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (pendingErr) throw pendingErr;

      // Get profiles for pending drivers
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
        .select(`
          id, user_id, vehicle_make, vehicle_model, plate_number, status, is_online
        `)
        .eq('status', 'approved')
        .eq('is_online', true)
        .limit(100);
      
      if (onlineErr) throw onlineErr;

      // Get profiles and locations for online drivers
      const onlineWithDetails = await Promise.all(
        (online || []).map(async (driver) => {
          const [profileRes, locationRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('user_id', driver.user_id)
              .single(),
            supabase
              .from('live_locations')
              .select('latitude, longitude, updated_at')
              .eq('user_id', driver.user_id)
              .single()
          ]);
          return {
            ...driver,
            profile: profileRes.data || undefined,
            location: locationRes.data || null
          };
        })
      );

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
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();

    // Refresh every 10s for monitoring
    const interval = setInterval(refreshAll, 10000);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, () => {
        refreshAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, () => {
        refreshAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
        refreshAll();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [refreshAll]);

  const setDriverStatus = async (driverId: string, status: 'approved' | 'suspended') => {
    setError('');
    const { error: updateErr } = await supabase
      .from('drivers')
      .update({ status })
      .eq('id', driverId);
    
    if (updateErr) {
      setError(updateErr.message);
      return;
    }

    // Log the action
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

  // Transform data for map
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
      pickupLat: (r as any).pickup_lat,
      pickupLng: (r as any).pickup_lon,
      dropoffLat: (r as any).dropoff_lat,
      dropoffLng: (r as any).dropoff_lon,
      status: r.status,
      pickupAddress: r.pickup_address,
      dropoffAddress: r.dropoff_address,
    }))
  , [activeRides]);

  return (
    <AdminGuard>
      <AdminLayout>
        <div style={S.wrap}>
          {/* Header */}
          <header style={S.header}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Koloi Admin</div>
              <div style={{ opacity: 0.7, fontSize: 13 }}>Approvals • Monitoring • Live tracking</div>
            </div>
            <button style={S.refreshBtn} onClick={refreshAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </header>

          {error && <div style={S.error}>{error}</div>}

          {/* Live Map */}
          <section style={{ ...S.card, marginBottom: 16 }}>
            <div style={S.cardTitle}>Live Map — Drivers & Active Rides</div>
            <AdminMap 
              drivers={mapDrivers} 
              rides={mapRides} 
              height="420px"
              className="mt-2"
            />
          </section>

          <div style={S.grid}>
            {/* Pending Approvals */}
            <section style={S.card}>
              <div style={S.cardTitle}>Pending driver approvals</div>
              {pendingDrivers.length === 0 ? (
                <div style={S.muted}>No pending drivers.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {pendingDrivers.map((d) => (
                    <div key={d.id} style={S.row}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {d.profile?.full_name || 'Unknown'}
                        </div>
                        <div style={S.muted}>
                          {d.profile?.phone || '—'} • {d.vehicle_make} {d.vehicle_model}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={S.okBtn} onClick={() => setDriverStatus(d.id, 'approved')}>
                          Approve
                        </button>
                        <button style={S.badBtn} onClick={() => setDriverStatus(d.id, 'suspended')}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Live Tracking */}
            <section style={S.card}>
              <div style={S.cardTitle}>Live tracking (online approved drivers)</div>
              {onlineDrivers.length === 0 ? (
                <div style={S.muted}>No drivers online.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {onlineDrivers.map((d) => (
                    <div key={d.id} style={S.row}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900 }}>{d.profile?.full_name || 'Unknown'}</div>
                        <div style={S.muted}>
                          Last seen: {d.location?.updated_at ? new Date(d.location.updated_at).toLocaleString() : '—'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 12 }}>
                          {d.location?.latitude && d.location?.longitude
                            ? `${d.location.latitude.toFixed(4)}, ${d.location.longitude.toFixed(4)}`
                            : 'No GPS'}
                        </div>
                        <button
                          style={S.smallBtn}
                          onClick={() => forceDriverOffline(d.user_id, d.id)}
                        >
                          Force offline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Ride Monitoring */}
            <section style={{ ...S.card, gridColumn: '1 / -1' }}>
              <div style={S.cardTitle}>Ride monitoring (latest)</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Time</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Pickup</th>
                      <th style={S.th}>Dropoff</th>
                      <th style={S.th}>Fare</th>
                      <th style={S.th}>Assigned driver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestRides.map((r) => (
                      <tr key={r.id}>
                        <td style={S.td}>{new Date(r.created_at).toLocaleString()}</td>
                        <td style={S.td}><b>{r.status}</b></td>
                        <td style={S.td}>{r.pickup_address || '—'}</td>
                        <td style={S.td}>{r.dropoff_address || '—'}</td>
                        <td style={S.td}>R{Number(r.fare).toFixed(2)}</td>
                        <td style={S.td}>{r.driver_id ? r.driver_id.slice(0, 8) + '…' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={S.muted}>(Next upgrade: show a map with pins for online drivers + active rides.)</div>
            </section>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
};

const S: Record<string, React.CSSProperties> = {
  wrap: {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    height: 44,
    padding: '0 16px',
    borderRadius: 14,
    border: 0,
    fontWeight: 900,
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
  },
  error: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#7f1d1d',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    fontWeight: 800,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'rgba(255,255,255,.95)',
    borderRadius: 22,
    padding: 16,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 10px 24px rgba(0,0,0,.08)',
    border: '1px solid rgba(0,0,0,.06)',
  },
  cardTitle: {
    fontWeight: 900,
    marginBottom: 12,
    fontSize: 15,
  },
  muted: {
    opacity: 0.7,
    fontSize: 13,
    lineHeight: 1.4,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    background: '#fff',
    border: '1px solid rgba(0,0,0,.06)',
    borderRadius: 16,
    padding: 12,
  },
  okBtn: {
    height: 40,
    padding: '0 14px',
    borderRadius: 12,
    border: 0,
    background: '#16a34a',
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer',
  },
  badBtn: {
    height: 40,
    padding: '0 14px',
    borderRadius: 12,
    border: 0,
    background: '#dc2626',
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer',
  },
  smallBtn: {
    marginTop: 6,
    height: 32,
    padding: '0 12px',
    borderRadius: 10,
    border: 0,
    background: '#111827',
    color: '#fff',
    fontWeight: 900,
    fontSize: 12,
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '10px 8px',
    borderBottom: '1px solid rgba(0,0,0,.10)',
    fontWeight: 800,
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid rgba(0,0,0,.06)',
  },
};

export default AdminDashboard;
