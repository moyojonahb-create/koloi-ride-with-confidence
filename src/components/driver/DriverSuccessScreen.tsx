import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DriverSuccessScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col px-4 py-6">
      <button className="self-start text-muted-foreground mb-4" onClick={() => navigate('/driver')}>
        ← Back
      </button>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-28 h-28 bg-gradient-to-r from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Application submitted</CardTitle>
            <CardDescription className="text-lg">
              Your driver profile is under review by our team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium">Status: Pending approval</div>
                <div className="text-sm text-muted-foreground">We will notify you once approved</div>
              </div>
            </div>
            <Button className="w-full h-14 rounded-xl" onClick={() => navigate('/driver')}>
              Go back to driver page
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

