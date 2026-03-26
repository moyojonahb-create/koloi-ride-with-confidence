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

  const fallbackCopy = (value: string) => {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Voyex Trip', text, url: shareUrl });
        return;
      }
    } catch {
      // share cancelled or failed, fall through to copy
    }
    await handleCopy();
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
      setCopied(true);
      toast.success('Trip link copied!', { description: shareUrl });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      fallbackCopy(text);
      setCopied(true);
      toast.success('Trip link copied!', { description: shareUrl });
      setTimeout(() => setCopied(false), 3000);
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
