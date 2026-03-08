import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletBalanceProps {
  balance: number;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function WalletBalance({ balance, onClick, className, size = 'md' }: WalletBalanceProps) {
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs gap-1',
    md: 'h-9 px-3 text-sm gap-1.5',
    lg: 'h-11 px-4 text-base gap-2',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const displayBalance = balance % 1 === 0 ? `R${balance}` : `R${balance.toFixed(1)}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center rounded-full bg-primary text-primary-foreground font-bold transition-all whitespace-nowrap',
        'hover:brightness-110 active:scale-95',
        sizeClasses[size],
        className
      )}
    >
      <Wallet className={cn(iconSizes[size], 'shrink-0')} />
      <span className="truncate">{displayBalance}</span>
    </button>
  );
}
