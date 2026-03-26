import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ShareTripProps {
  rideId: string;
  pickupAddress: string;
  dropoffAddress: string;
  driverName?: string;
}

export default function ShareTripButton({ rideId, pickupAddress, dropoffAddress, driverName }: ShareTripProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/track/${rideId}`;
  const text = [
    `🚗 Track my Voyex ride live!`,
    driverName ? `Driver: ${driverName}` : '',
    `From: ${pickupAddress}`,
    `To: ${dropoffAddress}`,
    ``,
    shareUrl,
  ].filter(Boolean).join('\n');

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Voyex Trip', text, url: shareUrl });
      } catch {
        // User cancelled
      }
    } else {
      await handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Trip link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center active:scale-[0.95] transition-all"
      title="Share Trip"
    >
      {copied ? (
        <Check className="w-4 h-4 text-primary" />
      ) : (
        <Share2 className="w-4 h-4 text-primary" />
      )}
    </button>
  );
}
