import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, AlertCircle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

interface DriverLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  is_online: boolean;
  updated_at: string;
  driver?: {
    id: string;
    status: string;
    vehicle_type: string;
    plate_number: string | null;
  };
  profile?: {
    full_name: string | null;
    phone: string | null;
  };
}

const AdminDriversMap = () => {
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);

  const fetchLocations = async () => {
    try {
      const { data: locationData, error } = await supabase
        .from('live_locations')
        .select('*')
        .eq('user_type', 'driver');

      if (error) throw error;

      // Enrich with driver and profile data
      const enrichedLocations = await Promise.all(
        (locationData || []).map(async (loc) => {
          const { data: driverData } = await supabase
            .from('drivers')
            .select('id, status, vehicle_type, plate_number')
            .eq('user_id', loc.user_id)
            .maybeSingle();

          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('user_id', loc.user_id)
            .maybeSingle();

          return {
            ...loc,
            driver: driverData || undefined,
            profile: profileData || undefined,
          };
        })
      );

      setLocations(enrichedLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();

    // Subscribe to realtime location updates
    const channel = supabase
      .channel('admin-driver-locations')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'live_locations' },
        () => {
          fetchLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string, isOnline: boolean) => {
    if (!isOnline) return 'bg-gray-100 text-gray-700';
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'suspended':
      case 'banned': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const onlineCount = locations.filter(l => l.is_online).length;
  const approvedOnline = locations.filter(l => l.is_online && l.driver?.status === 'approved').length;

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/admin/drivers">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Driver Locations</h1>
                <p className="text-sm text-muted-foreground">
                  {locations.length} drivers with location data • {onlineCount} online
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{locations.length}</p>
                  <p className="text-xs text-muted-foreground">Total Tracked</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{onlineCount}</p>
                  <p className="text-xs text-muted-foreground">Online Now</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedOnline}</p>
                  <p className="text-xs text-muted-foreground">Active (Approved)</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{locations.length - onlineCount}</p>
                  <p className="text-xs text-muted-foreground">Offline</p>
                </div>
              </div>
            </div>
          </div>

          {/* Driver List */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">All Driver Locations</h2>
            </div>

            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : locations.length === 0 ? (
              <div className="p-12 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-foreground mb-2">No Location Data</h3>
                <p className="text-sm text-muted-foreground">
                  No drivers have shared their location yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    className={cn(
                      "p-4 hover:bg-secondary/50 transition-colors cursor-pointer",
                      selectedDriver?.id === loc.id && "bg-secondary"
                    )}
                    onClick={() => setSelectedDriver(selectedDriver?.id === loc.id ? null : loc)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          loc.is_online ? "bg-emerald-100" : "bg-gray-100"
                        )}>
                          <MapPin className={cn(
                            "w-5 h-5",
                            loc.is_online ? "text-emerald-600" : "text-gray-400"
                          )} />
                        </div>
                        <div>
                          <p className="font-medium">
                            {loc.profile?.full_name || 'Unknown Driver'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {loc.driver?.vehicle_type} • {loc.driver?.plate_number || 'No plate'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(loc.driver?.status || 'pending', loc.is_online)}>
                          {loc.is_online ? loc.driver?.status || 'unknown' : 'offline'}
                        </Badge>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedDriver?.id === loc.id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Coordinates</p>
                            <p className="font-mono">{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Phone</p>
                            <p>{loc.profile?.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Update</p>
                            <p>{new Date(loc.updated_at).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Status</p>
                            <p className="capitalize">{loc.driver?.status || 'Unknown'}</p>
                          </div>
                        </div>
                        {loc.driver?.id && (
                          <Button asChild className="mt-4" size="sm">
                            <Link to={`/admin/drivers/${loc.driver.id}`}>
                              View Full Profile
                            </Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Map View Disabled</p>
              <p className="text-sm text-amber-700 mt-1">
                The interactive map has been disabled. Driver locations are displayed as a list with coordinates.
                You can still view driver details and manage their status.
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminDriversMap;
