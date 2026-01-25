import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle, Car } from 'lucide-react';

interface ApplicationStatusProps {
  status: string;
  vehicleInfo: {
    make: string | null;
    model: string | null;
    year: number | null;
    plateNumber: string | null;
    type: string;
  };
  documentsStatus: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

const ApplicationStatus = ({ status, vehicleInfo, documentsStatus }: ApplicationStatusProps) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          label: 'Approved',
          description: 'Congratulations! You are now an approved driver.',
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          label: 'Rejected',
          description: 'Your application was not approved. Please check document feedback.',
        };
      case 'suspended':
        return {
          icon: AlertCircle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          label: 'Suspended',
          description: 'Your driver account has been temporarily suspended.',
        };
      default:
        return {
          icon: Clock,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          label: 'Pending Review',
          description: 'Your application is being reviewed by our team.',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const allDocsApproved = documentsStatus.approved === documentsStatus.total && documentsStatus.total > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
              <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle>Application Status</CardTitle>
                <Badge variant={status === 'approved' ? 'default' : 'secondary'}>
                  {statusInfo.label}
                </Badge>
              </div>
              <CardDescription>{statusInfo.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{documentsStatus.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{documentsStatus.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{documentsStatus.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{documentsStatus.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-accent/10">
              <Car className="h-6 w-6 text-accent" />
            </div>
            <div>
              <CardTitle>Vehicle Information</CardTitle>
              <CardDescription>Your registered vehicle details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Make</p>
              <p className="font-medium">{vehicleInfo.make || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="font-medium">{vehicleInfo.model || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Year</p>
              <p className="font-medium">{vehicleInfo.year || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plate Number</p>
              <p className="font-medium">{vehicleInfo.plateNumber || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Vehicle Type</p>
              <Badge variant="outline" className="mt-1 capitalize">{vehicleInfo.type}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplicationStatus;
