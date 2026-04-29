import { CheckCircle2, AlertTriangle, Wallet, Banknote } from 'lucide-react';

interface PaymentStatusBadgeProps {
  status: string; // ride status (e.g. completed, cancelled)
  paymentMethod?: string | null;
  walletPaid?: boolean | null;
  paymentFailed?: boolean | null;
  paymentFailureReason?: string | null;
  size?: 'sm' | 'md';
  showReason?: boolean;
}

/**
 * Visual payment status indicator for a ride.
 * - Shows "Payment Successful" when ride completed and paid (wallet/cash/etc.).
 * - Shows "Payment Failed" with the failure reason when payment_failed = true.
 * - Renders nothing for non-completed rides (pending, cancelled, etc.).
 */
export default function PaymentStatusBadge({
  status,
  paymentMethod,
  walletPaid,
  paymentFailed,
  paymentFailureReason,
  size = 'sm',
  showReason = true,
}: PaymentStatusBadgeProps) {
  if (status !== 'completed' && !paymentFailed) return null;

  const isFailed = !!paymentFailed;
  const isWallet = paymentMethod === 'wallet';
  // For wallet rides, success requires wallet_paid. For cash/other, completion implies paid.
  const isSuccess = !isFailed && (isWallet ? walletPaid === true : status === 'completed');

  if (!isFailed && !isSuccess) return null;

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (isFailed) {
    return (
      <div className="inline-flex flex-col items-start gap-0.5 max-w-full">
        <span
          className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/30 ${padding}`}
        >
          <AlertTriangle className={iconSize} />
          Payment Failed
        </span>
        {showReason && paymentFailureReason && (
          <span className="text-[10px] text-destructive/80 leading-tight max-w-[220px] truncate">
            {paymentFailureReason}
          </span>
        )}
      </div>
    );
  }

  const Icon = isWallet ? Wallet : Banknote;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 ${padding}`}
    >
      <CheckCircle2 className={iconSize} />
      Payment Successful
      <Icon className={`${iconSize} opacity-70 ml-0.5`} />
    </span>
  );
}
