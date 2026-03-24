import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function DeleteAccount() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmation !== 'DELETE') return;
    if (!user) return;

    setDeleting(true);
    try {
      // Call edge function that handles account deletion server-side
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { userId: user.id },
      });

      if (error) throw error;
      if (data && !data.ok) throw new Error(data.reason || 'Deletion failed');

      toast.success('Account deleted successfully');
      await signOut();
      navigate('/');
    } catch (err: unknown) {
      toast.error('Failed to delete account', {
        description: 'Please contact support at support@pickme.co.zw',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Delete Account</h1>
      </header>

      <main className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">This action is permanent</p>
            <p className="text-xs text-muted-foreground mt-1">
              Deleting your account will permanently remove all your data including ride history, wallet balance, and profile information. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-foreground">What will be deleted:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Your profile and personal information</li>
            <li>Ride history and trip data</li>
            <li>Wallet balance and transaction history</li>
            <li>Saved locations and favorites</li>
            <li>Driver account (if applicable)</li>
          </ul>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Type <span className="font-bold text-destructive">DELETE</span> to confirm
          </label>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Type DELETE"
            className="font-mono"
          />
        </div>

        <Button
          variant="destructive"
          className="w-full"
          disabled={confirmation !== 'DELETE' || deleting}
          onClick={handleDelete}
        >
          {deleting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
          ) : (
            'Permanently Delete My Account'
          )}
        </Button>

        <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </main>
    </div>
  );
}
