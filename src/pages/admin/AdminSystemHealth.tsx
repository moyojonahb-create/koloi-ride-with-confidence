import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw, AlertTriangle, CheckCircle2, Clock, Zap, Activity,
  Database, Shield, Bug, TrendingDown, Server, Users, Gauge, Eye
} from 'lucide-react';
import { format, subHours, subDays } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';

interface HealthCheck {
  id: string;
  category: 'error' | 'performance' | 'security' | 'database' | 'suggestion';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  suggestion: string;
  timestamp: string;
  affectedUsers?: number;
  context?: string;
}

interface PerformanceMetric {
  label: string;
  value: number;
  unit: string;
  status: 'good' | 'warn' | 'critical';
  threshold: { warn: number; critical: number };
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  info: 'bg-muted text-muted-foreground border-border',
};

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  error: Bug,
  performance: Gauge,
  security: Shield,
  database: Database,
  suggestion: Zap,
};

export default function AdminSystemHealth() {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [errorTimeline, setErrorTimeline] = useState<{ hour: string; errors: number; slowQueries: number }[]>([]);
  const [filter, setFilter] = useState<string>('all');

  const runSystemScan = useCallback(async () => {
    setScanning(true);
    const findings: HealthCheck[] = [];
    const now = new Date();

    try {
      // 1. Check for orphaned rides (pending > 30 min)
      const thirtyMinAgo = subHours(now, 0.5).toISOString();
      const { data: staleRides, count: staleCount } = await supabase
        .from('rides')
        .select('id, created_at, status', { count: 'exact' })
        .eq('status', 'pending')
        .lt('created_at', thirtyMinAgo)
        .limit(5);

      if (staleCount && staleCount > 0) {
        findings.push({
          id: 'stale-rides',
          category: 'database',
          severity: staleCount > 10 ? 'high' : 'medium',
          title: `${staleCount} stale pending rides detected`,
          description: `Rides stuck in "pending" status for over 30 minutes. This may indicate the expiry trigger is not firing correctly.`,
          suggestion: 'Run expire_old_rides() function manually or check the ride expiry trigger. Consider increasing driver availability in affected areas.',
          timestamp: now.toISOString(),
          affectedUsers: staleCount,
        });
      }

      // 2. Check driver wallet balances (low balance = can't operate)
      const { data: lowBalanceDrivers, count: lowBalCount } = await supabase
        .from('driver_wallets')
        .select('driver_id, balance_usd', { count: 'exact' })
        .lt('balance_usd', 0.5)
        .limit(5);

      if (lowBalCount && lowBalCount > 0) {
        findings.push({
          id: 'low-balance-drivers',
          category: 'suggestion',
          severity: lowBalCount > 5 ? 'high' : 'low',
          title: `${lowBalCount} drivers with insufficient balance`,
          description: `Drivers with balance below $0.50 cannot accept rides after trial. This reduces driver supply.`,
          suggestion: 'Consider sending push notifications to these drivers reminding them to deposit. Or review if the minimum balance threshold is appropriate.',
          timestamp: now.toISOString(),
          affectedUsers: lowBalCount,
        });
      }

      // 3. Check for unresolved emergency alerts
      const { count: unresolvedAlerts } = await supabase
        .from('emergency_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false);

      if (unresolvedAlerts && unresolvedAlerts > 0) {
        findings.push({
          id: 'unresolved-sos',
          category: 'security',
          severity: 'critical',
          title: `${unresolvedAlerts} unresolved SOS alerts!`,
          description: `Emergency alerts that have not been addressed. User safety is at risk.`,
          suggestion: 'Immediately review all emergency alerts. Contact affected users and local authorities if needed.',
          timestamp: now.toISOString(),
          affectedUsers: unresolvedAlerts,
        });
      }

      // 4. Check for open disputes > 24h
      const oneDayAgo = subDays(now, 1).toISOString();
      const { count: oldDisputes } = await supabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .lt('created_at', oneDayAgo);

      if (oldDisputes && oldDisputes > 0) {
        findings.push({
          id: 'old-disputes',
          category: 'suggestion',
          severity: 'medium',
          title: `${oldDisputes} disputes open for 24+ hours`,
          description: `Users are waiting for resolution. Long response times hurt trust and retention.`,
          suggestion: 'Prioritize resolving old disputes. Consider setting up auto-escalation for disputes older than 12 hours.',
          timestamp: now.toISOString(),
          affectedUsers: oldDisputes,
        });
      }

      // 5. Check for fraud flags
      const { count: unresolvedFraud } = await supabase
        .from('fraud_flags')
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false);

      if (unresolvedFraud && unresolvedFraud > 0) {
        findings.push({
          id: 'fraud-flags',
          category: 'security',
          severity: unresolvedFraud > 3 ? 'high' : 'medium',
          title: `${unresolvedFraud} unresolved fraud flags`,
          description: `Potential fraudulent activity detected but not yet reviewed.`,
          suggestion: 'Review fraud flags in the admin panel. Check for GPS spoofing patterns and suspicious ride patterns.',
          timestamp: now.toISOString(),
        });
      }

      // 6. Check pending driver approvals (bottleneck)
      const { count: pendingDrivers } = await supabase
        .from('drivers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingDrivers && pendingDrivers > 3) {
        findings.push({
          id: 'pending-drivers',
          category: 'suggestion',
          severity: pendingDrivers > 10 ? 'high' : 'low',
          title: `${pendingDrivers} drivers waiting for approval`,
          description: `New driver applications are queued. Slow approvals reduce driver supply and platform growth.`,
          suggestion: 'Review pending driver applications. Consider batch approval for drivers with complete documentation.',
          timestamp: now.toISOString(),
        });
      }

      // 7. Check ride cancellation rate (last 24h)
      const { count: totalRides24h } = await supabase
        .from('rides')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);

      const { count: cancelledRides24h } = await supabase
        .from('rides')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('created_at', oneDayAgo);

      if (totalRides24h && cancelledRides24h && totalRides24h > 5) {
        const cancelRate = (cancelledRides24h / totalRides24h) * 100;
        if (cancelRate > 30) {
          findings.push({
            id: 'high-cancel-rate',
            category: 'performance',
            severity: cancelRate > 50 ? 'critical' : 'high',
            title: `${cancelRate.toFixed(0)}% cancellation rate (24h)`,
            description: `${cancelledRides24h} of ${totalRides24h} rides were cancelled. This is abnormally high.`,
            suggestion: 'Investigate reasons for cancellations. Check if pricing is competitive, driver ETAs are reasonable, and the matching algorithm is efficient.',
            timestamp: now.toISOString(),
            affectedUsers: cancelledRides24h,
          });
        }
      }

      // 8. Check for rides without offers (no driver response)
      const twoHoursAgo = subHours(now, 2).toISOString();
      const { data: noOfferRides } = await supabase
        .from('rides')
        .select('id')
        .in('status', ['expired', 'cancelled'])
        .gte('created_at', twoHoursAgo)
        .limit(100);

      if (noOfferRides && noOfferRides.length > 0) {
        // Check which had zero offers
        const rideIds = noOfferRides.map(r => r.id);
        const { data: offersForRides } = await supabase
          .from('offers')
          .select('ride_id')
          .in('ride_id', rideIds);

        const ridesWithOffers = new Set(offersForRides?.map(o => o.ride_id) || []);
        const ridesWithoutOffers = rideIds.filter(id => !ridesWithOffers.has(id));

        if (ridesWithoutOffers.length > 3) {
          findings.push({
            id: 'no-driver-response',
            category: 'performance',
            severity: ridesWithoutOffers.length > 10 ? 'high' : 'medium',
            title: `${ridesWithoutOffers.length} rides with zero driver offers (2h)`,
            description: `Riders requested rides but no drivers responded. This indicates supply-demand imbalance.`,
            suggestion: 'Check if enough drivers are online. Consider expanding service area or adjusting pricing to attract more drivers.',
            timestamp: now.toISOString(),
            affectedUsers: ridesWithoutOffers.length,
          });
        }
      }

      // 9. Database health - check for large tables without recent cleanup
      const { count: oldMessages } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', subDays(now, 7).toISOString());

      if (oldMessages && oldMessages > 1000) {
        findings.push({
          id: 'message-cleanup',
          category: 'database',
          severity: 'low',
          title: `${oldMessages} old messages need cleanup`,
          description: `Chat messages older than 7 days are accumulating. This slows down queries and increases storage costs.`,
          suggestion: 'Run cleanup_old_messages() or set up a scheduled cron job to purge old messages automatically.',
          timestamp: now.toISOString(),
        });
      }

      // 10. Check online drivers with stale locations (> 5 min)
      const fiveMinAgo = subHours(now, 5 / 60).toISOString();
      const { data: onlineDrivers } = await supabase
        .from('drivers')
        .select('id, user_id')
        .eq('status', 'approved')
        .eq('is_online', true);

      if (onlineDrivers && onlineDrivers.length > 0) {
        const userIds = onlineDrivers.map(d => d.user_id);
        const { data: locations } = await supabase
          .from('live_locations')
          .select('user_id, updated_at')
          .in('user_id', userIds);

        const staleDrivers = onlineDrivers.filter(d => {
          const loc = locations?.find(l => l.user_id === d.user_id);
          return !loc || new Date(loc.updated_at) < new Date(fiveMinAgo);
        });

        if (staleDrivers.length > 0) {
          findings.push({
            id: 'stale-driver-locations',
            category: 'performance',
            severity: 'medium',
            title: `${staleDrivers.length} online drivers with stale GPS`,
            description: `These drivers show as online but haven't sent location updates recently. They may have poor connectivity or app issues.`,
            suggestion: 'Consider auto-setting these drivers offline after 5 minutes of no GPS updates to improve rider experience.',
            timestamp: now.toISOString(),
            affectedUsers: staleDrivers.length,
          });
        }
      }

      // If no issues found
      if (findings.length === 0) {
        findings.push({
          id: 'all-clear',
          category: 'suggestion',
          severity: 'info',
          title: '✅ All systems healthy',
          description: 'No critical issues detected during this scan.',
          suggestion: 'Continue monitoring. The next scan will check for new issues.',
          timestamp: now.toISOString(),
        });
      }

      // Build performance metrics
      const perfMetrics: PerformanceMetric[] = [
        {
          label: 'Online Drivers',
          value: onlineDrivers?.length || 0,
          unit: 'drivers',
          status: (onlineDrivers?.length || 0) >= 3 ? 'good' : (onlineDrivers?.length || 0) >= 1 ? 'warn' : 'critical',
          threshold: { warn: 3, critical: 1 },
        },
        {
          label: 'Cancellation Rate',
          value: totalRides24h && cancelledRides24h ? Math.round((cancelledRides24h / totalRides24h) * 100) : 0,
          unit: '%',
          status: totalRides24h && cancelledRides24h
            ? (cancelledRides24h / totalRides24h) > 0.5 ? 'critical' : (cancelledRides24h / totalRides24h) > 0.3 ? 'warn' : 'good'
            : 'good',
          threshold: { warn: 30, critical: 50 },
        },
        {
          label: 'Pending Approvals',
          value: pendingDrivers || 0,
          unit: 'drivers',
          status: (pendingDrivers || 0) > 10 ? 'critical' : (pendingDrivers || 0) > 3 ? 'warn' : 'good',
          threshold: { warn: 3, critical: 10 },
        },
        {
          label: 'Open Disputes',
          value: (oldDisputes || 0),
          unit: 'disputes',
          status: (oldDisputes || 0) > 5 ? 'critical' : (oldDisputes || 0) > 0 ? 'warn' : 'good',
          threshold: { warn: 1, critical: 5 },
        },
      ];

      // Build error timeline (hourly ride activity)
      const timeline: { hour: string; errors: number; slowQueries: number }[] = [];
      for (let i = 23; i >= 0; i--) {
        const hourStart = subHours(now, i + 1);
        const hourEnd = subHours(now, i);
        const { count: cancelledInHour } = await supabase
          .from('rides')
          .select('id', { count: 'exact', head: true })
          .in('status', ['cancelled', 'expired'])
          .gte('created_at', hourStart.toISOString())
          .lt('created_at', hourEnd.toISOString());

        const { count: completedInHour } = await supabase
          .from('rides')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('created_at', hourStart.toISOString())
          .lt('created_at', hourEnd.toISOString());

        timeline.push({
          hour: format(hourEnd, 'HH:mm'),
          errors: cancelledInHour || 0,
          slowQueries: completedInHour || 0,
        });
      }

      setChecks(findings.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      }));
      setMetrics(perfMetrics);
      setErrorTimeline(timeline);
      setLastScan(now.toISOString());

    } catch (err) {
      console.error('System scan failed:', err);
      setChecks([{
        id: 'scan-error',
        category: 'error',
        severity: 'critical',
        title: 'System scan failed',
        description: `The health check could not complete: ${(err as Error).message}`,
        suggestion: 'Check database connectivity and RLS policies. Ensure admin role is properly configured.',
        timestamp: now.toISOString(),
      }]);
    } finally {
      setScanning(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSystemScan();
  }, [runSystemScan]);

  const filteredChecks = filter === 'all' ? checks : checks.filter(c => c.category === filter);

  const criticalCount = checks.filter(c => c.severity === 'critical').length;
  const highCount = checks.filter(c => c.severity === 'high').length;
  const totalIssues = checks.filter(c => c.severity !== 'info').length;

  const STATUS_COLORS = { good: 'text-emerald-600', warn: 'text-amber-600', critical: 'text-red-600' };
  const STATUS_BG = { good: 'bg-emerald-500/10', warn: 'bg-amber-500/10', critical: 'bg-red-500/10' };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
                <Activity className="w-6 h-6 text-primary" />
                System Health Agent
              </h1>
              <p className="text-sm text-muted-foreground">
                Automated monitoring • {lastScan ? `Last scan: ${format(new Date(lastScan), 'HH:mm:ss')}` : 'No scan yet'}
              </p>
            </div>
            <Button onClick={runSystemScan} disabled={scanning} className="font-bold">
              <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning…' : 'Run Scan'}
            </Button>
          </div>

          {/* Overall Status Banner */}
          <Card className={criticalCount > 0 ? 'border-red-500/30 bg-red-500/5' : highCount > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                {criticalCount > 0 ? (
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                ) : highCount > 0 ? (
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {criticalCount > 0
                      ? `${criticalCount} Critical Issue${criticalCount > 1 ? 's' : ''} Found`
                      : highCount > 0
                      ? `${highCount} Issue${highCount > 1 ? 's' : ''} Need Attention`
                      : 'All Systems Healthy'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {totalIssues} total finding{totalIssues !== 1 ? 's' : ''} across {checks.length} checks
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map(m => (
              <Card key={m.label}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${STATUS_BG[m.status]}`}>
                      <Gauge className={`h-5 w-5 ${STATUS_COLORS[m.status]}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-black ${STATUS_COLORS[m.status]}`}>{m.value}<span className="text-sm font-medium text-muted-foreground ml-1">{m.unit}</span></p>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 24h Activity Timeline */}
          {errorTimeline.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h2 className="font-bold text-sm flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-primary" />
                  24h Activity (Cancelled/Expired vs Completed)
                </h2>
                <ChartContainer config={{
                  errors: { label: 'Cancelled/Expired', color: 'hsl(0 84% 60%)' },
                  slowQueries: { label: 'Completed', color: 'hsl(142 76% 36%)' },
                }} className="h-48 w-full">
                  <AreaChart data={errorTimeline} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="slowQueries" fill="hsl(142 76% 36% / 0.2)" stroke="hsl(142 76% 36%)" name="Completed" />
                    <Area type="monotone" dataKey="errors" fill="hsl(0 84% 60% / 0.2)" stroke="hsl(0 84% 60%)" name="Cancelled/Expired" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'error', 'performance', 'security', 'database', 'suggestion'].map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={filter === cat ? 'default' : 'outline'}
                onClick={() => setFilter(cat)}
                className="capitalize font-semibold"
              >
                {cat === 'all' ? `All (${checks.length})` : `${cat} (${checks.filter(c => c.category === cat).length})`}
              </Button>
            ))}
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-4/5" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredChecks.length === 0 ? (
              <Card>
                <CardContent className="pt-6 pb-6 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-foreground">No issues in this category</p>
                  <p className="text-sm text-muted-foreground">Everything looks good!</p>
                </CardContent>
              </Card>
            ) : (
              filteredChecks.map(check => {
                const Icon = CATEGORY_ICONS[check.category] || Bug;
                return (
                  <Card key={check.id} className={check.severity === 'critical' ? 'border-red-500/30' : check.severity === 'high' ? 'border-amber-500/30' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          check.severity === 'critical' ? 'bg-red-500/10' :
                          check.severity === 'high' ? 'bg-orange-500/10' :
                          check.severity === 'medium' ? 'bg-amber-500/10' :
                          'bg-muted'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            check.severity === 'critical' ? 'text-red-600' :
                            check.severity === 'high' ? 'text-orange-600' :
                            check.severity === 'medium' ? 'text-amber-600' :
                            'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-sm text-foreground">{check.title}</p>
                            <Badge variant="outline" className={`text-[10px] ${SEVERITY_COLORS[check.severity]}`}>
                              {check.severity}
                            </Badge>
                            {check.affectedUsers && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Users className="w-3 h-3" /> {check.affectedUsers} affected
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{check.description}</p>
                          <div className="bg-primary/5 border border-primary/10 rounded-lg p-2.5">
                            <p className="text-[11px] font-semibold text-primary flex items-center gap-1 mb-0.5">
                              <Zap className="w-3 h-3" /> Suggestion
                            </p>
                            <p className="text-xs text-foreground/80">{check.suggestion}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            Detected at {format(new Date(check.timestamp), 'HH:mm:ss · MMM d')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
