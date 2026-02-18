import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MapPin, Navigation, DollarSign } from 'lucide-react';

export default function RiderRequestScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [offeredFare, setOfferedFare] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequest() {
    if (!user) {
      toast({ title: 'Not logged in', description: 'Please log in first.', variant: 'destructive' });
      return;
    }
    if (!pickup.trim() || !dropoff.trim() || !offeredFare) {
      toast({ title: 'Missing fields', description: 'Fill in all fields.', variant: 'destructive' });
      return;
    }
    const fare = parseFloat(offeredFare);
    if (isNaN(fare) || fare <= 0) {
      toast({ title: 'Invalid fare', description: 'Enter a valid fare amount.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('ride_requests')
      .insert({
        rider_id: user.id,
        pickup: pickup.trim(),
        dropoff: dropoff.trim(),
        offered_fare: fare,
        currency: 'USD',
        status: 'negotiating',
      })
      .select('id')
      .single();

    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    navigate(`/negotiate/offers/${data.id}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Request a Ride</h1>
      </div>

      <div className="flex-1 p-6 space-y-5 max-w-md mx-auto w-full">
        <p className="text-sm text-muted-foreground">
          Set your pickup, dropoff, and the fare you're willing to pay. Drivers will counter-offer.
        </p>

        {/* Pickup */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Pickup Location
          </Label>
          <Input
            placeholder="e.g. Gwanda Town Centre"
            value={pickup}
            onChange={e => setPickup(e.target.value)}
          />
        </div>

        {/* Dropoff */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Navigation className="w-4 h-4 text-accent" /> Drop-off Location
          </Label>
          <Input
            placeholder="e.g. Colleen Bawn"
            value={dropoff}
            onChange={e => setDropoff(e.target.value)}
          />
        </div>

        {/* Offered Fare */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Your Offered Fare (USD)
          </Label>
          <Input
            type="number"
            placeholder="e.g. 5"
            min="0.01"
            step="0.01"
            value={offeredFare}
            onChange={e => setOfferedFare(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Drivers can negotiate a different price.</p>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleRequest}
          disabled={loading || !pickup || !dropoff || !offeredFare}
        >
          {loading ? 'Submitting…' : 'Request Ride'}
        </Button>
      </div>
    </div>
  );
}
