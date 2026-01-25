import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapIcon, List, AlertCircle } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminGuard from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const AdminDriversMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);
  const [showList, setShowList] = useState(false);

  // Default center: Gwanda, Zimbabwe
  const defaultCenter = { lng: 29.0147, lat: -20.9389 };

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

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [defaultCenter.lng, defaultCenter.lat],
        zoom: 12,
        attributionControl: false,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError('Failed to load map');
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Failed to load map');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add driver markers
    locations.forEach((loc) => {
      const status = loc.driver?.status || 'pending';
      const isOnline = loc.is_online;
      
      let color = '#9CA3AF'; // Gray for offline
      if (isOnline) {
        if (status === 'approved') color = '#10B981'; // Green
        else if (status === 'pending') color = '#F59E0B'; // Amber
        else if (status === 'suspended' || status === 'banned') color = '#EF4444'; // Red
      }

      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2M5 17l-1 2h16l-1-2"/>
            <circle cx="7.5" cy="17" r="2"/>
            <circle cx="16.5" cy="17" r="2"/>
          </svg>
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedDriver(loc);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [locations]);

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

  if (!MAPBOX_TOKEN) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/admin/drivers">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Live Driver Map</h1>
            </div>
            
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <MapIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-foreground mb-2">Map Unavailable</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Mapbox token not configured. Showing driver list instead.
              </p>
              
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : locations.length === 0 ? (
                <p className="text-muted-foreground">No driver locations available</p>
              ) : (
                <div className="space-y-3 text-left max-w-md mx-auto">
                  {locations.map((loc) => (
                    <div key={loc.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <p className="font-medium">{loc.profile?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {loc.driver?.vehicle_type} • {loc.driver?.plate_number || 'No plate'}
                        </p>
                      </div>
                      <Badge className={getStatusColor(loc.driver?.status || 'pending', loc.is_online)}>
                        {loc.is_online ? loc.driver?.status : 'offline'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-4 h-[calc(100vh-8rem)]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/admin/drivers">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Live Driver Map</h1>
                <p className="text-sm text-muted-foreground">
                  {locations.length} drivers with location data
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowList(!showList)}
            >
              <List className="w-4 h-4 mr-2" />
              {showList ? 'Hide List' : 'Show List'}
            </Button>
          </div>

          {/* Map Container */}
          <div className="flex gap-4 h-full">
            <div className={cn(
              "relative rounded-xl overflow-hidden border border-border flex-1",
              mapError && "bg-secondary"
            )}>
              {mapError ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="text-destructive">{mapError}</p>
                  </div>
                </div>
              ) : (
                <div ref={mapContainer} className="w-full h-full" />
              )}

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-md text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Online (Approved)</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>Online (Pending)</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Suspended</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span>Offline</span>
                </div>
              </div>
            </div>

            {/* Side Panel */}
            {(showList || selectedDriver) && (
              <div className="w-80 bg-card rounded-xl border border-border p-4 overflow-y-auto">
                {selectedDriver ? (
                  <div className="space-y-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedDriver(null)}
                    >
                      ← Back to list
                    </Button>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                        <MapIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg">
                        {selectedDriver.profile?.full_name || 'Unknown Driver'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDriver.profile?.phone || 'No phone'}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className={getStatusColor(selectedDriver.driver?.status || 'pending', selectedDriver.is_online)}>
                          {selectedDriver.is_online ? selectedDriver.driver?.status : 'offline'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vehicle</span>
                        <span className="capitalize">{selectedDriver.driver?.vehicle_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plate</span>
                        <span>{selectedDriver.driver?.plate_number || 'N/A'}</span>
                      </div>
                    </div>
                    {selectedDriver.driver?.id && (
                      <Button asChild className="w-full">
                        <Link to={`/admin/drivers/${selectedDriver.driver.id}`}>
                          View Full Profile
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-semibold">All Drivers</h3>
                    {loading ? (
                      [...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))
                    ) : locations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No driver locations
                      </p>
                    ) : (
                      locations.map((loc) => (
                        <button
                          key={loc.id}
                          onClick={() => {
                            setSelectedDriver(loc);
                            if (map.current) {
                              map.current.flyTo({
                                center: [loc.longitude, loc.latitude],
                                zoom: 15,
                              });
                            }
                          }}
                          className="w-full flex items-center justify-between p-3 bg-secondary/50 hover:bg-secondary rounded-lg text-left transition-colors"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {loc.profile?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {loc.driver?.vehicle_type} • {loc.driver?.plate_number || 'No plate'}
                            </p>
                          </div>
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            loc.is_online 
                              ? loc.driver?.status === 'approved' 
                                ? 'bg-emerald-500' 
                                : loc.driver?.status === 'pending'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              : 'bg-gray-400'
                          )} />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminDriversMap;
