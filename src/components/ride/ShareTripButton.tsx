import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareTripProps {
  rideId: string;
  pickupAddress: string;
  dropoffAddress: string;
  driverName?: string;
}

export default function ShareTripButton({ rideId, pickupAddress, dropoffAddress, driverName }: ShareTripProps) {
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/track/${rideId}`;
    const text = [
      `🚗 I'm on a PickMe ride!`,
      driverName ? `Driver: ${driverName}` : '',
      `From: ${pickupAddress}`,
      `To: ${dropoffAddress}`,
      `Track my trip live: ${shareUrl}`,
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My PickMe Trip', text, url: shareUrl });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Live tracking link copied!');
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className="flex items-center gap-2 h-11 rounded-2xl glass-card border-primary/20 text-primary hover:bg-primary/5"
    >
      <Share2 className="w-4 h-4" />
      <span className="text-sm font-semibold">Share Trip</span>
    </Button>
  );
}
