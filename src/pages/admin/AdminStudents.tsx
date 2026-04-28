import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, RotateCcw, ShieldAlert, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';

interface Quality {
  brightness?: number;
  glare?: boolean;
  blur?: number;
  width?: number;
  height?: number;
}

interface Row {
  id: string;
  user_id: string;
  registration_number: string;
  national_id_number: string;
  face_match_score: number;
  verification_status: string;
  fraud_score: number;
  attempt_count: number;
  device_id: string | null;
  rejection_reason: string | null;
  id_photo_path: string | null;
  selfie_photo_path: string | null;
  id_photo_quality: Quality | null;
  selfie_photo_quality: Quality | null;
  created_at: string;
  institutions: { name: string; city: string } | null;
}

function QualityChips({ q, label }: { q: Quality | null; label: string }) {
  if (!q) return <p className="text-[10px] text-muted-foreground">{label}: no quality data</p>;
  const tone = (ok: boolean) => ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';
  const brightOk = (q.brightness ?? 50) >= 30 && (q.brightness ?? 50) <= 85;
  const blurOk = (q.blur ?? 0) <= 60;
  const glareOk = !q.glare;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[10px] font-semibold text-muted-foreground mr-0.5">{label}:</span>
      <Badge className={`text-[10px] ${tone(brightOk)}`}>☀ {q.brightness ?? '?'}%</Badge>
      <Badge className={`text-[10px] ${tone(glareOk)}`}>{q.glare ? 'Glare' : 'No glare'}</Badge>
      <Badge className={`text-[10px] ${tone(blurOk)}`}>Blur {q.blur ?? '?'}</Badge>
    </div>
  );
}

export default function AdminStudents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'locked'>('pending');
  const [signed, setSigned] = useState<Record<string, { id?: string; selfie?: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('student_profiles').select('*, institutions(name, city)').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('verification_status', filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const sign = async (row: Row) => {
    if (signed[row.id]) return;
    const out: { id?: string; selfie?: string } = {};
    if (row.id_photo_path) {
      const { data } = await supabase.storage.from('student-verification').createSignedUrl(row.id_photo_path, 600);
      out.id = data?.signedUrl;
    }
    if (row.selfie_photo_path) {
      const { data } = await supabase.storage.from('student-verification').createSignedUrl(row.selfie_photo_path, 600);
      out.selfie = data?.signedUrl;
    }
    setSigned(prev => ({ ...prev, [row.id]: out }));
  };

  const update = async (row: Row, patch: Partial<Row> & Record<string, unknown>) => {
    const { error } = await supabase.from('student_profiles').update(patch as never).eq('id', row.id);
    if (error) return toast.error(error.message);
    toast.success('Updated');
    load();
  };

  return (
    <AdminLayout>
      <div className="p-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          <h1 className="text-2xl font-bold">Student Verifications</h1>
        </div>

        <div className="flex gap-1.5 mb-4 overflow-x-auto">
          {(['pending', 'approved', 'rejected', 'locked', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-card border-border'}`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">No records.</p>
        ) : (
          <div className="space-y-3">
            {rows.map(row => (
              <div key={row.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold">{row.institutions?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{row.institutions?.city}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono">Reg: {row.registration_number}</Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">NID: {row.national_id_number}</Badge>
                    </div>
                  </div>
                  <Badge className={
                    row.verification_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    row.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    row.verification_status === 'locked' ? 'bg-rose-100 text-rose-700' :
                    'bg-slate-100 text-slate-700'
                  }>{row.verification_status}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-muted-foreground">Match</p>
                    <p className="font-bold">{row.face_match_score}/100</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-muted-foreground">Fraud</p>
                    <p className={`font-bold ${row.fraud_score >= 50 ? 'text-rose-600' : ''}`}>{row.fraud_score}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-muted-foreground">Attempts</p>
                    <p className="font-bold">{row.attempt_count}</p>
                  </div>
                </div>

                {row.rejection_reason && (
                  <p className="text-xs text-rose-600 mb-2">Notes: {row.rejection_reason}</p>
                )}

                <div className="space-y-1 mb-3">
                  <QualityChips q={row.id_photo_quality} label="ID photo" />
                  <QualityChips q={row.selfie_photo_quality} label="Selfie" />
                </div>

                {!signed[row.id] && (
                  <Button size="sm" variant="outline" onClick={() => sign(row)} className="mb-2 text-xs">View photos</Button>
                )}
                {signed[row.id] && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {signed[row.id].id && <img src={signed[row.id].id} alt="ID" className="rounded-lg w-full h-32 object-cover" />}
                    {signed[row.id].selfie && <img src={signed[row.id].selfie} alt="Selfie" className="rounded-lg w-full h-32 object-cover" />}
                  </div>
                )}

                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" onClick={() => update(row, { verification_status: 'approved', student_mode_active: true, approved_at: new Date().toISOString(), rejection_reason: null })}
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const reason = prompt('Reason for rejection?') ?? 'Rejected by admin';
                    update(row, { verification_status: 'rejected', student_mode_active: false, rejection_reason: reason });
                  }} className="text-xs gap-1">
                    <XCircle className="w-3 h-3" /> Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => update(row, { device_id: null, attempt_count: 0 })} className="text-xs gap-1">
                    <RotateCcw className="w-3 h-3" /> Reset device
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => update(row, { fraud_score: 0 })} className="text-xs gap-1">
                    <ShieldAlert className="w-3 h-3" /> Clear fraud
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
