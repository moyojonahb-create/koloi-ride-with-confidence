import { AlertCircle, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useState } from 'react';

interface EmailVerificationBannerProps {
  email: string;
  emailConfirmedAt: string | null | undefined;
}

/**
 * Shows a persistent banner when the user's email is not verified.
 * Blocks ride requests until verification is complete.
 */
export default function EmailVerificationBanner({ email, emailConfirmedAt }: EmailVerificationBannerProps) {
  const [resending, setResending] = useState(false);

  if (emailConfirmedAt) return null;

  const resendVerification = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      toast.success('Verification email sent! Check your inbox.');
    } catch (err) {
      console.error('Failed to resend verification:', err);
      toast.error('Failed to send verification email. Try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Verify your email to request rides</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          We sent a verification link to <strong>{email}</strong>. Please check your inbox and spam folder.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 gap-1.5 text-xs"
          onClick={resendVerification}
          disabled={resending}
        >
          <MailCheck className="h-3.5 w-3.5" />
          {resending ? 'Sending...' : 'Resend Verification Email'}
        </Button>
      </div>
    </div>
  );
}
