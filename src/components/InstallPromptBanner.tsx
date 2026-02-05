import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import koloiLogo from '@/assets/koloi-logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (within 7 days)
    const lastShown = Number(localStorage.getItem('koloi_install_modal_last') || 0);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - lastShown < sevenDays) {
      return;
    }

    // Detect iOS
    const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // For iOS, show modal after a delay
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        localStorage.setItem('koloi_install_modal_last', String(Date.now()));
        setShowModal(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show modal after a short delay
      setTimeout(() => {
        localStorage.setItem('koloi_install_modal_last', String(Date.now()));
        setShowModal(true);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowModal(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowModal(false);
      return;
    }
    
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowModal(false);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
  };

  if (isInstalled || !showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 flex items-start justify-center pt-[10vh] px-4">
      <div className="w-full max-w-[520px] bg-background rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <img 
              src={koloiLogo} 
              alt="Koloi" 
              className="w-12 h-12 rounded-xl object-cover"
            />
            <div>
              <h2 className="text-lg font-bold text-foreground">Install Koloi</h2>
              <p className="text-sm text-muted-foreground">Get picked. Get moving.</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isIOS ? (
            <div className="space-y-4">
              <p className="text-foreground leading-relaxed">
                Install Koloi on your iPhone for the best experience:
              </p>
              <ol className="space-y-3 text-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</span>
                  <span>Tap the <strong>Share</strong> button in Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</span>
                  <span>Tap <strong>Add</strong> in the top right corner</span>
                </li>
              </ol>
            </div>
          ) : (
            <p className="text-foreground leading-relaxed">
              Install Koloi to your home screen for quick access and the best ride-hailing experience.
            </p>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 p-4 pt-0 justify-end">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="px-4"
          >
            Not now
          </Button>
          <Button
            onClick={handleInstall}
            className="px-4 gap-2"
          >
            {isIOS ? (
              'Got it'
            ) : (
              <>
                <Download className="w-4 h-4" />
                Install
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
