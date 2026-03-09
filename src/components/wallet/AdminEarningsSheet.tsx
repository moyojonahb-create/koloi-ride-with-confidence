import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface AdminEarning {
  id: string;
  ride_id: string | null;
  driver_id: string;
  fare_amount: number;
  platform_fee: number;
  driver_earnings: number;
  created_at: string;
}

interface AdminEarningsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  earnings: AdminEarning[];
  totalFares: number;
  totalPlatformFees: number;
}

export default function AdminEarningsSheet({
  isOpen,
  onClose,
  earnings,
  totalFares,
  totalPlatformFees,
}: AdminEarningsSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Platform Earnings</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-500/10 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Total Fares</p>
              <p className="text-lg font-black text-blue-500">${totalFares.toFixed(2)}</p>
            </div>
            <div className="bg-green-500/10 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Platform Fees</p>
              <p className="text-lg font-black text-green-500">${totalPlatformFees.toFixed(2)}</p>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Driver Payouts</p>
              <p className="text-lg font-black text-amber-500">
                ${(totalFares - totalPlatformFees).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Earnings Table */}
          <div className="overflow-auto max-h-[calc(85vh-280px)] rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fare</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead>Driver Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No earnings recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  earnings.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">
                        {format(new Date(e.created_at), 'dd MMM, HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number(e.fare_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        ${Number(e.platform_fee).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-amber-600 font-medium">
                        R{Number(e.driver_earnings).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
