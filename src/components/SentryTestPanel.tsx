import { useState } from 'react';
import * as Sentry from '@sentry/react';

// Buggy component to test React error boundary capture
function BrokenComponent() {
  throw new Error('Sentry test: React render crash');
}

export default function SentryTestPanel() {
  const [crash, setCrash] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const sendManual = () => {
    const id = Sentry.captureException(new Error('Sentry test: manual captureException'));
    setSent(id);
  };

  const sendMessage = () => {
    const id = Sentry.captureMessage('Sentry test: captureMessage from PickMe', 'info');
    setSent(id);
  };

  const throwUnhandled = () => {
    // Triggers the global unhandledrejection listener
    Promise.reject(new Error('Sentry test: unhandled promise rejection'));
  };

  const throwGlobal = () => {
    // Triggers the global error listener
    setTimeout(() => { throw new Error('Sentry test: global JS error'); }, 0);
  };

  if (crash) return <BrokenComponent />;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-card border border-border rounded-2xl shadow-2xl p-4 w-72 space-y-2">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">🔴 Sentry Test Panel</p>

      {sent && (
        <p className="text-[10px] text-green-600 break-all">
          ✅ Sent event: {sent}
        </p>
      )}

      <button onClick={sendManual}
        className="w-full text-sm py-2 px-3 rounded-xl bg-destructive text-destructive-foreground hover:opacity-90">
        captureException
      </button>

      <button onClick={sendMessage}
        className="w-full text-sm py-2 px-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90">
        captureMessage
      </button>

      <button onClick={throwUnhandled}
        className="w-full text-sm py-2 px-3 rounded-xl bg-amber-500 text-white hover:opacity-90">
        Unhandled Promise Rejection
      </button>

      <button onClick={throwGlobal}
        className="w-full text-sm py-2 px-3 rounded-xl bg-orange-600 text-white hover:opacity-90">
        Global JS Error
      </button>

      <button onClick={() => setCrash(true)}
        className="w-full text-sm py-2 px-3 rounded-xl bg-rose-700 text-white hover:opacity-90">
        React Render Crash
      </button>
    </div>
  );
}
