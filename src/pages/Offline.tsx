import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import voyexIcon from '@/assets/voyex-icon-only.png';

export default function Offline() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <img src={voyexIcon} alt="Voyex" className="w-28 h-28 rounded-2xl object-contain mb-6 opacity-60" />
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <WifiOff className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">You're Offline</h1>
      <p className="text-muted-foreground max-w-xs mb-8">
        It looks like you've lost your internet connection. Check your Wi-Fi or mobile data and try again.
      </p>
      <Button onClick={handleRetry} size="lg" className="rounded-xl gap-2 px-8">
        <RefreshCw className="w-5 h-5" />
        Try Again
      </Button>
      <p className="text-muted-foreground text-xs mt-10">
        Some features like viewing the map may still work offline.
      </p>
    </div>
  );
}
