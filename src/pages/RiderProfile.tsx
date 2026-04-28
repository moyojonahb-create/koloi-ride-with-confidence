import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useDriverStatus } from '@/hooks/useDriverStatus';
// Rider wallet removed — riders pay drivers directly
import { useProfileStats } from '@/hooks/useProfileStats';
import { supabase } from '@/lib/supabaseClient';
import { resolveAvatarUrl } from '@/lib/avatarUrl';
import {
  ArrowLeft, User, LogOut, Shield, Car, Bell, ShieldCheck, CarFront,
  MapPin, ChevronRight, Edit3, History, Camera, Loader2, Wallet,
  Moon, Sun, Trash2, Gift, Navigation, Banknote, Users, Copy, Check,
  DollarSign, TrendingUp, GraduationCap,
} from 'lucide-react';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomNavBar from '@/components/BottomNavBar';
import PickMeLogo from '@/components/PickMeLogo';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import RiderPreferencesSettings from '@/components/settings/RiderPreferencesSettings';
import { toast } from 'sonner';
import { haptic } from '@/lib/haptics';
import { format } from 'date-fns';

export default function RiderProfile() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { isApproved: isApprovedDriver } = useDriverStatus();
  // Rider wallet removed
  const { stats } = useProfileStats();
  const { profile: studentProfile } = useStudentProfile();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMapp = location.pathname.startsWith('/mapp');
  const prefix = isMapp ? '/mapp' : '';
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

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
        .then(async ({ data }) => {
          if (data?.avatar_url) {
            const resolved = await resolveAvatarUrl(data.avatar_url);
            if (resolved) setAvatarUrl(resolved);
          }
        });
    }
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be less than 5MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('driver-avatars').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: signedData, error: signedErr } = await supabase.storage.from('driver-avatars').createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedErr || !signedData?.signedUrl) throw signedErr || new Error('Failed to get URL');
      setAvatarUrl(signedData.signedUrl);
      await supabase.from('profiles').update({ avatar_url: path }).eq('user_id', user.id);
      toast.success('Photo updated!');
    } catch (err: unknown) {
      toast.error('Upload failed', { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const handleCopyReferral = async () => {
    if (!stats.referralCode) return;
    const text = `Join PickMe and ride! Use my code: ${stats.referralCode} — You earn $2!`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Join PickMe', text }); return; } catch { /* fallback */ }
    }
    await navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => { haptic('medium'); await signOut(); navigate('/'); };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 relative overflow-hidden" style={{ background: 'var(--gradient-primary)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
        <div className="relative px-4 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
          {/* Profile info (left) + logo (right) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer group shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center ring-2 ring-primary-foreground/30 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-primary-foreground">{initials}</span>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center border-[1.5px] border-primary group-hover:scale-110 transition-transform">
                  {uploading ? <Loader2 className="w-2 h-2 animate-spin text-accent-foreground" /> : <Camera className="w-2 h-2 text-accent-foreground" />}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-primary-foreground truncate leading-tight">{userName}</h1>
                {userEmail && <p className="text-[10px] text-primary-foreground/60 truncate mt-0.5">{userEmail}</p>}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isAdmin && user?.email?.toLowerCase() === 'moyojonahb@gmail.com' && (
                    <Badge className="h-4 text-[9px] bg-primary-foreground/15 text-primary-foreground border-0 px-1.5 cursor-pointer" onClick={() => navigate(`${prefix}/admin`)}>
                      <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Admin
                    </Badge>
                  )}
                  {isApprovedDriver && (
                    <Badge className="h-4 text-[9px] bg-primary-foreground/15 text-primary-foreground border-0 px-1.5 cursor-pointer" onClick={() => navigate(`${prefix}/driver`)}>
                      <CarFront className="w-2.5 h-2.5 mr-0.5" /> Driver
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <PickMeLogo size="sm" />
          </div>
        </div>
      </div>

      {/* Back button outside header */}
      <div className="px-4 pt-2">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {/* Quick actions row with stats */}
        <div className="grid grid-cols-4 gap-2">
          <QuickAction
            icon={<MapPin className="w-5 h-5" />}
            label="Ride"
            sublabel={stats.completedRides > 0 ? `${stats.completedRides} trips` : 'Book now'}
            onClick={() => navigate(`${prefix}/ride`)}
            accent
            color="primary"
          />
          <QuickAction
            icon={<History className="w-5 h-5" />}
            label="History"
            sublabel={stats.lastRideDate ? format(new Date(stats.lastRideDate), 'MMM d') : 'No rides'}
            onClick={() => navigate(`${prefix}/history`)}
          />
          <QuickAction
            icon={<Shield className="w-5 h-5" />}
            label="Safety"
            sublabel="SOS & tips"
            onClick={() => navigate(`${prefix}/safety`)}
          />
          <QuickAction
            icon={<Car className="w-5 h-5" />}
            label="Drive"
            sublabel={isApprovedDriver ? 'Active' : 'Earn $'}
            onClick={() => navigate(`${prefix}/driver`)}
          />
        </div>

        {/* Ride Activity Summary */}
        {stats.completedRides > 0 && (
          <div className="glass-card rounded-2xl p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Ride Activity</p>
            <div className="grid grid-cols-3 gap-3">
              <StatMini icon={<Navigation className="w-3.5 h-3.5 text-primary" />} value={`${stats.totalDistance.toFixed(0)} km`} label="Distance" />
              <StatMini icon={<Banknote className="w-3.5 h-3.5 text-accent" />} value={`$${stats.totalSpent.toFixed(0)}`} label="Spent" />
              <StatMini icon={<TrendingUp className="w-3.5 h-3.5 text-primary" />} value={`${stats.completedRides}`} label="Trips" />
            </div>
          </div>
        )}

        {/* Referral Card */}
        {stats.referralCode && (
          <div className="glass-card rounded-2xl p-3.5 bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Invite & Earn $2</p>
                  <p className="text-[10px] text-muted-foreground">
                    {stats.referralCount > 0
                      ? `${stats.referralCount} referred · $${stats.referralEarnings} earned`
                      : 'Share your code with friends'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyReferral}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-all"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {stats.referralCode}
              </button>
            </div>
          </div>
        )}

        {/* Preferences — collapsible */}
        <details className="glass-card rounded-2xl overflow-hidden group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Preferences</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-2 pb-3">
            <RiderPreferencesSettings />
          </div>
        </details>

        {/* Settings rows */}
        <div className="space-y-1.5">
          {/* Dark Mode */}
          <div className="w-full flex items-center gap-3 px-4 py-3 glass-card rounded-2xl">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-accent" />}
            <span className="text-sm font-medium text-foreground flex-1">Dark Mode</span>
            <Switch checked={theme === 'dark'} onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')} />
          </div>

          <NavRow
            icon={<Bell className="w-4 h-4 text-primary" />}
            label="Notifications"
            sublabel={stats.unreadNotifications > 0 ? `${stats.unreadNotifications} unread` : 'Manage alerts'}
            onClick={() => navigate(`${prefix}/edit-profile`)}
            badge={stats.unreadNotifications > 0 ? stats.unreadNotifications : undefined}
          />
          <NavRow
            icon={<User className="w-4 h-4 text-primary" />}
            label="Edit Profile"
            sublabel="Photo, name, phone"
            onClick={() => navigate(`${prefix}/edit-profile`)}
          />
          <NavRow
            icon={<Shield className="w-4 h-4 text-primary" />}
            label="Safety"
            sublabel="Emergency contacts, SOS"
            onClick={() => navigate(`${prefix}/safety`)}
          />
          <NavRow
            icon={<Trash2 className="w-4 h-4 text-destructive" />}
            label="Delete Account"
            sublabel="Permanent action"
            onClick={() => navigate('/delete-account')}
          />
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

/* ——— Sub-components ——— */

function QuickAction({ icon, label, sublabel, onClick, accent, color = 'yellow' }: {
  icon: React.ReactNode; label: string; sublabel?: string; onClick: () => void; accent?: boolean; color?: 'yellow' | 'primary';
}) {
  const colorMap = {
    yellow: { bg: 'bg-yellow-400/20', text: 'text-yellow-700', accentBg: 'bg-yellow-400', accentText: 'text-yellow-900' },
    primary: { bg: 'bg-primary/15', text: 'text-primary', accentBg: 'bg-primary', accentText: 'text-primary-foreground' },
  };
  const c = colorMap[color];
  return (
    <button
      onClick={() => { haptic('light'); onClick(); }}
      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl active:scale-95 transition-all ${
        accent ? `${c.accentBg} ${c.accentText} shadow-md` : `${c.bg} ${c.text} shadow-sm`
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold leading-tight">{label}</span>
      {sublabel && (
        <span className={`text-[8px] leading-tight ${accent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {sublabel}
        </span>
      )}
    </button>
  );
}

function StatMini({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function NavRow({ icon, label, sublabel, onClick, badge }: {
  icon: React.ReactNode; label: string; sublabel?: string; onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 glass-card hover:bg-foreground/[0.02] active:scale-[0.98] transition-all text-left rounded-2xl">
      {icon}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground block">{label}</span>
        {sublabel && <span className="text-[10px] text-muted-foreground">{sublabel}</span>}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
