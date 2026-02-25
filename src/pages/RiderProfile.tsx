import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, User, CreditCard, Calendar, Gift, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PaymentMethodSelector, { type PaymentMethod } from '@/components/ride/PaymentMethodSelector';
import ScheduleRide from '@/components/ride/ScheduleRide';
import ReferralShare from '@/components/ride/ReferralShare';
import KoloiLogo from '@/components/KoloiLogo';

export default function RiderProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
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
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 bg-primary text-primary-foreground" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}>
        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-white/10 text-primary-foreground hover:bg-white/20" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <KoloiLogo variant="light" size="sm" />
      </header>

      {/* Profile Card */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground truncate">{userName}</h1>
            {userEmail && <p className="text-sm text-muted-foreground truncate">{userEmail}</p>}
            {userPhone && <p className="text-sm text-muted-foreground">{userPhone}</p>}
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
        {/* Payment Method */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payment Method</h2>
          </div>
          <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} />
        </section>

        {/* Schedule */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Schedule a Ride</h2>
          </div>
          <ScheduleRide scheduledAt={scheduledAt} onSchedule={setScheduledAt} />
        </section>

        {/* Referral */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Invite Friends</h2>
          </div>
          <ReferralShare />
        </section>

        {/* Quick Links */}
        <section className="space-y-2">
          <button
            onClick={() => navigate('/ride')}
            className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl border border-border hover:bg-muted transition-colors text-left"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-foreground">Request a Ride</span>
          </button>
          <button
            onClick={() => navigate('/negotiate/request')}
            className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl border border-border hover:bg-muted transition-colors text-left"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-foreground">Negotiate a Price</span>
          </button>
        </section>

        {/* Sign Out */}
        <Button variant="outline" className="w-full h-12 rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
