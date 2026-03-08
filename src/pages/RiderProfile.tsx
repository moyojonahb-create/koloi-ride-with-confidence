import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useDriverStatus } from '@/hooks/useDriverStatus';
import { ArrowLeft, User, CreditCard, Calendar, Gift, Settings, LogOut, Shield, Car, Bell, ShieldCheck, CarFront, MapPin, Zap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PaymentMethodSelector, { type PaymentMethod } from '@/components/ride/PaymentMethodSelector';
import ScheduleRide from '@/components/ride/ScheduleRide';
import ReferralShare from '@/components/ride/ReferralShare';
import KoloiLogo from '@/components/KoloiLogo';
import RiderSettingsPanel from '@/components/settings/RiderSettingsPanel';
import RiderBottomNav from '@/components/ride/RiderBottomNav';

export default function RiderProfile() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { isApproved: isApprovedDriver } = useDriverStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const isMapp = location.pathname.startsWith('/mapp');
  const prefix = isMapp ? '/mapp' : '';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Rider';
  const userEmail = user?.email || '';
  const userPhone = user?.user_metadata?.phone || user?.phone || '';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] bg-background relative">
      {/* Blue gradient header */}
      <div className="h-48 w-full" style={{ background: 'linear-gradient(135deg, hsl(215 85% 31%), hsl(215 85% 40%), hsl(215 60% 50%))' }}>
        <div className="flex items-center justify-between px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
          <button onClick={() => navigate(-1)} className="w-11 h-11 flex items-center justify-center rounded-full glass-btn active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <KoloiLogo variant="light" size="sm" />
        </div>
      </div>

      {/* Profile card overlapping header */}
      <div className="px-4 -mt-20 relative z-10">
        <div className="glass-card-heavy rounded-3xl p-6 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center ring-2 ring-primary/20">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-foreground truncate">{userName}</h1>
              {userEmail && <p className="text-sm text-muted-foreground truncate">{userEmail}</p>}
              {userPhone && <p className="text-sm text-muted-foreground">{userPhone}</p>}
              <div className="flex items-center gap-2 mt-2">
                {isAdmin && (
                  <Badge
                    className="glass-card border-primary/20 text-primary cursor-pointer hover:bg-primary/10 glass-glow-blue"
                    onClick={() => navigate(`${prefix}/admin`)}>
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
                {isApprovedDriver && (
                  <Badge
                    className="glass-card border-accent/20 text-accent-foreground cursor-pointer hover:bg-accent/10 glass-glow-yellow"
                    onClick={() => navigate(`${prefix}/driver`)}>
                    <CarFront className="w-3 h-3 mr-1" />
                    Driver
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-8 space-y-5">
        {/* Payment Method */}
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Payment Method</h2>
          </div>
          <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} />
        </section>

        {/* Schedule */}
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Schedule a Ride</h2>
          </div>
          <ScheduleRide scheduledAt={scheduledAt} onSchedule={setScheduledAt} />
        </section>

        {/* Referral */}
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-accent" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Invite Friends</h2>
          </div>
          <ReferralShare />
        </section>

        {/* Notifications */}
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Notifications</h2>
          </div>
          <RiderSettingsPanel />
        </section>

        {/* Quick Links */}
        <section className="space-y-2">
          <QuickLink icon={<MapPin className="w-5 h-5 text-primary" />} label="Request a Ride" onClick={() => navigate(`${prefix}/ride`)} />
          <QuickLink icon={<Zap className="w-5 h-5 text-accent" />} label="Negotiate a Price" onClick={() => navigate(`${prefix}/negotiate/request`)} />
          <QuickLink icon={<Shield className="w-5 h-5 text-primary" />} label="Safety" onClick={() => navigate(`${prefix}/safety`)} />
          <QuickLink icon={<Car className="w-5 h-5 text-muted-foreground" />} label="Driver Mode" onClick={() => navigate(`${prefix}/driver-mode`)} />
        </section>

        {/* Sign Out */}
        <Button
          variant="outline"
          className="w-full h-12 rounded-2xl text-destructive border-destructive/20 hover:bg-destructive/5 glass-card"
          onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>

        <div className="h-24" />
      </div>

      <RiderBottomNav activeTab="profile" />
    </div>
  );
}

function QuickLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 glass-card rounded-2xl hover:bg-foreground/[0.02] active:scale-[0.98] transition-all text-left">
      {icon}
      <span className="font-medium text-foreground flex-1">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
