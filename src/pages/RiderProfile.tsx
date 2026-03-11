import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useDriverStatus } from '@/hooks/useDriverStatus';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, User, CreditCard, Calendar, Gift, LogOut, Shield, Car, Bell, ShieldCheck, CarFront, MapPin, Zap, ChevronRight, Edit3, History, Camera, Loader2, Wallet, Moon, Sun, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomNavBar from '@/components/BottomNavBar';
import PaymentMethodSelector, { type PaymentMethod } from '@/components/ride/PaymentMethodSelector';
import ScheduleRide from '@/components/ride/ScheduleRide';
import ReferralShare from '@/components/ride/ReferralShare';
import RiderSettingsPanel from '@/components/settings/RiderSettingsPanel';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';

export default function RiderProfile() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { isApproved: isApprovedDriver } = useDriverStatus();
  const { balance } = useWallet();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMapp = location.pathname.startsWith('/mapp');
  const prefix = isMapp ? '/mapp' : '';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Rider';
  const userEmail = user?.email || '';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        });
    }
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('driver-avatars')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from('driver-avatars')
        .getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', user.id);
      toast.success('Photo updated!');
    } catch (err: unknown) {
      toast.error('Upload failed', { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => { haptic('medium'); await signOut(); navigate('/'); };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Compact header */}
      <div className="relative overflow-hidden" style={{ background: 'var(--gradient-primary)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
        <div className="relative px-4 pb-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-foreground/10 backdrop-blur-sm active:scale-95 transition-all">
              <ArrowLeft className="w-5 h-5 text-primary-foreground" />
            </button>
            <h2 className="text-sm font-semibold text-primary-foreground/80 tracking-wide">Profile</h2>
            <button onClick={() => navigate(`${prefix}/edit-profile`)} className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-foreground/10 backdrop-blur-sm active:scale-95 transition-all">
              <Edit3 className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>

          {/* Avatar + info inline */}
          <div className="flex items-center gap-3.5">
            <label className="relative cursor-pointer group shrink-0">
              <div className="w-14 h-14 rounded-full bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center ring-2 ring-primary-foreground/20 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-primary-foreground">{initials}</span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-accent flex items-center justify-center border-2 border-primary group-hover:scale-110 transition-transform">
                {uploading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-accent-foreground" />
                ) : (
                  <Camera className="w-3 h-3 text-accent-foreground" />
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-primary-foreground truncate leading-tight">{userName}</h1>
              {userEmail && <p className="text-xs text-primary-foreground/60 truncate mt-0.5">{userEmail}</p>}
              <div className="flex items-center gap-1.5 mt-1.5">
                {isAdmin && (
                  <Badge className="h-5 text-[10px] bg-primary-foreground/15 text-primary-foreground border-0 px-2 cursor-pointer" onClick={() => navigate(`${prefix}/admin`)}>
                    <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Admin
                  </Badge>
                )}
                {isApprovedDriver && (
                  <Badge className="h-5 text-[10px] bg-primary-foreground/15 text-primary-foreground border-0 px-2 cursor-pointer" onClick={() => navigate(`${prefix}/driver`)}>
                    <CarFront className="w-2.5 h-2.5 mr-0.5" /> Driver
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {/* Quick actions row */}
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={<MapPin className="w-5 h-5" />} label="Ride" onClick={() => navigate(`${prefix}/ride`)} accent />
          <QuickAction icon={<Wallet className="w-5 h-5" />} label={`$${balance.toFixed(0)}`} onClick={() => navigate(`${prefix}/wallet`)} />
          <QuickAction icon={<History className="w-5 h-5" />} label="History" onClick={() => navigate(`${prefix}/ride-history`)} />
          <QuickAction icon={<Car className="w-5 h-5" />} label="Drive" onClick={() => navigate(`${prefix}/driver-mode`)} />
        </div>

        {/* Payment */}
        <section className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Payment</h2>
          </div>
          <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} />
        </section>

        {/* Schedule */}
        <section className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Schedule</h2>
          </div>
          <ScheduleRide scheduledAt={scheduledAt} onSchedule={setScheduledAt} />
        </section>

        <div className="grid grid-cols-1 gap-3">
          <section className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Gift className="w-3.5 h-3.5 text-accent" />
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Invite Friends</h2>
            </div>
            <ReferralShare />
          </section>

          <section className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <Bell className="w-3.5 h-3.5 text-primary" />
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Notifications</h2>
            </div>
            <RiderSettingsPanel />
          </section>

          {/* Dark Mode */}
          <section className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-accent" />}
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Easier on your eyes at night</p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
              />
            </div>
          </section>
        </div>

        {/* Links */}
        <div className="space-y-1.5">
          <NavRow icon={<User className="w-4 h-4 text-primary" />} label="Edit Profile" onClick={() => navigate(`${prefix}/edit-profile`)} />
          <NavRow icon={<Shield className="w-4 h-4 text-primary" />} label="Safety" onClick={() => navigate(`${prefix}/safety`)} />
        </div>

        <Button variant="outline" className="w-full h-11 rounded-2xl text-destructive border-destructive/20 hover:bg-destructive/5 glass-card text-sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>

        <div className="h-20" />
      </div>

      <BottomNavBar />
    </div>
  );
}

function QuickAction({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={() => { haptic('light'); onClick(); }}
      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl active:scale-95 transition-all ${
        accent ? 'bg-primary text-primary-foreground shadow-md' : 'bg-accent text-accent-foreground shadow-sm'
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

function NavRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 glass-card hover:bg-foreground/[0.02] active:scale-[0.98] transition-all text-left rounded-2xl">
      {icon}
      <span className="text-sm font-medium text-foreground flex-1">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
