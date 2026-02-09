import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowUpRight, ArrowDownLeft, Car, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal' | 'trip_fee' | 'refund';
  description: string | null;
  created_at: string;
}

interface TransactionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  title?: string;
}

const typeConfig = {
  deposit: {
    icon: ArrowDownLeft,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: 'Deposit',
  },
  withdrawal: {
    icon: ArrowUpRight,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'Withdrawal',
  },
  trip_fee: {
    icon: Car,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    label: 'Trip Fee',
  },
  refund: {
    icon: RotateCcw,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    label: 'Refund',
  },
};

export default function TransactionsSheet({ isOpen, onClose, transactions, title = 'Transactions' }: TransactionsSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(80vh-100px)]">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No transactions yet</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const config = typeConfig[tx.transaction_type] || typeConfig.deposit;
              const Icon = config.icon;
              const isPositive = tx.amount > 0;

              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                >
                  <div className={`p-2 rounded-full ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{config.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tx.description || 'No description'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                  <div className={`font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}R{Math.abs(tx.amount).toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
