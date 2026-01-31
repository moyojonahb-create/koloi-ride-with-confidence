import { useState, useEffect } from 'react';
import { Clock, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Ride {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number;
  duration_minutes: number;
  fare: number;
  status: string;
  created_at: string;
}

interface RideHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const RideHistorySheet = ({ isOpen, onClose }: RideHistorySheetProps) => {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchRides();
    }
  }, [isOpen, user]);

  const fetchRides = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load ride history');
      console.error(error);
    } else {
      setRides(data || []);
    }
    setLoading(false);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Ride History
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No rides yet</p>
              <p className="text-sm">Your ride history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => (
                <div
                  key={ride.id}
                  className="p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(ride.created_at), 'MMM d, yyyy • h:mm a')}
                    </div>
                    <div className="font-semibold text-lg">
                      R{Number(ride.fare).toFixed(0)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0" />
                      <p className="text-sm truncate flex-1">{ride.pickup_address}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent mt-1 flex-shrink-0" />
                      <p className="text-sm truncate flex-1">{ride.dropoff_address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span>{ride.distance_km.toFixed(1)} km</span>
                    <span>•</span>
                    <span>{formatDuration(ride.duration_minutes)}</span>
                    <span className="ml-auto capitalize px-2 py-0.5 rounded-full bg-secondary text-xs">
                      {ride.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RideHistorySheet;
