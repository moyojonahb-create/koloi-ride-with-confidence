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
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-base gap-2',
    lg: 'h-12 px-5 text-lg gap-2.5',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center rounded-full bg-blue-500 text-white font-bold transition-all',
        'hover:bg-blue-600 active:scale-95',
        sizeClasses[size],
        className
      )}
    >
      <Wallet className={iconSizes[size]} />
      <span>R{balance.toFixed(2)}</span>
    </button>
  );
}
