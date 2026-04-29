import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, MapPin, Navigation, Clock, Banknote, Car, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import PickMeLogo from '@/components/PickMeLogo';
import BottomNavBar from '@/components/BottomNavBar';
import RiderSpendingAnalytics from '@/components/ride/RiderSpendingAnalytics';
import PaymentStatusBadge from '@/components/ride/PaymentStatusBadge';


interface RideRecord {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  fare: number;
  distance_km: number;
  duration_minutes: number;
  status: string;
  created_at: string;
  payment_method: string;
  vehicle_type: string;
  wallet_paid?: boolean | null;
  payment_failed?: boolean | null;
  payment_failure_reason?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
  expired: 'bg-muted text-muted-foreground',
  pending: 'bg-accent/10 text-accent-foreground',
  in_progress: 'bg-primary/10 text-primary',
};

export default function RideHistory() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMapp = location.pathname.startsWith('/mapp');
  const prefix = isMapp ? '/mapp' : '';
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) fetchRides();
  }, [user, authLoading]);

  const fetchRides = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rides')
      .select('id, pickup_address, dropoff_address, fare, distance_km, duration_minutes, status, created_at, payment_method, vehicle_type, wallet_paid, payment_failed, payment_failure_reason')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) setRides(data);
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-card-heavy border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-14" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold font-display text-foreground">My Trips</h1>
          <PickMeLogo size="sm" />
        </div>
      </div>

      <div className="px-4 py-4 pb-28 space-y-4">
        {!loading && rides.length > 0 && <RiderSpendingAnalytics rides={rides} />}
        
        {loading ? (
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">Loading your trips…</span>
            </div>
            <div className="space-y-2.5">
              <div className="h-4 rounded-lg skeleton" />
              <div className="h-4 rounded-lg skeleton w-5/6" />
              <div className="h-4 rounded-lg skeleton w-2/3" />
            </div>
          </div>
        ) : rides.length === 0 ? (
          <div className="glass-card text-center py-12 px-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Car className="w-7 h-7" />
            </div>
            <p className="text-foreground font-semibold">No trips yet</p>
            <p className="text-sm text-muted-foreground mt-1">Your ride history will appear here</p>
            <button
              onClick={() => navigate(`${prefix}/ride`)}
              className="mt-4 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              Book your first ride
            </button>
          </div>
        ) : (
          rides.map((ride) => (
            <button
              key={ride.id}
              onClick={() => navigate(`${prefix}/ride/${ride.id}`)}
              className="w-full glass-card p-4 text-left hover:bg-foreground/[0.02] active:scale-[0.98] transition-all"
              style={{ borderRadius: 18 }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[ride.status] || STATUS_COLORS.pending}`}>
                      {ride.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ride.created_at), 'MMM d, yyyy · h:mm a')}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{ride.pickup_address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{ride.dropoff_address}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/30 pt-2.5 mt-1">
                <span className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5" />
                  ${Number(ride.fare).toFixed(2)}
                </span>
                <span className="flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" />
                  {ride.distance_km.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {ride.duration_minutes} min
                </span>
                <span className="ml-auto capitalize">{ride.payment_method}</span>
              </div>

              {(ride.status === 'completed' || ride.payment_failed) && (
                <div className="mt-2.5">
                  <PaymentStatusBadge
                    status={ride.status}
                    paymentMethod={ride.payment_method}
                    walletPaid={ride.wallet_paid}
                    paymentFailed={ride.payment_failed}
                    paymentFailureReason={ride.payment_failure_reason}
                  />
                </div>
              )}
            </button>
          ))
        )}
      </div>

      <BottomNavBar />
    </div>
  );
}
