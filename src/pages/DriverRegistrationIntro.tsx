import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Shield, Clock, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DriverRegistrationIntro() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col px-4 py-6">
      <button className="text-muted-foreground mb-4" onClick={() => navigate('/driver')}>
        ← Back
      </button>
      <div className="flex-1 flex flex-col justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-accent to-primary rounded-2xl flex items-center justify-center mb-4">
              <Car className="w-10 h-10 text-background" />
            </div>
            <CardTitle className="text-2xl">Become a driver</CardTitle>
            <CardDescription className="text-lg">
              Create your driver profile and submit your documents for approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-xl">
              <Shield className="w-5 h-5 text-accent" />
              <div>
                <div className="font-medium text-sm">Safety first</div>
                <div className="text-xs text-muted-foreground">Verified drivers only</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl text-primary">
              <Clock className="w-5 h-5" />
              <div>
                <div className="font-medium text-sm">Flexible schedule</div>
                <div className="text-xs text-primary/80">Drive when you want</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-accent" />
              <div>
                <div className="font-medium text-sm">Earn more</div>
                <div className="text-xs text-muted-foreground">Set your own prices</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <div className="w-full h-1 bg-muted rounded-full" />
          <div className="flex-1 h-1 bg-accent rounded-full" />
          <div className="text-xs">Step 1 of 6</div>
        </div>
        <Button className="w-full h-14 rounded-2xl text-lg" onClick={() => navigate('/driver/register/step1')}>
          Start
        </Button>
      </div>
    </div>
  );
}

