import { MessageSquare, Users, Phone, Shield, Car, AlertTriangle, Lock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import KoloiLogo from '@/components/KoloiLogo';

const protectionCards = [
  { icon: Shield, title: 'Proactive safety support', color: 'bg-accent/20 text-accent' },
  { icon: Users, title: 'Passengers verification', color: 'bg-accent/20 text-accent' },
  { icon: Lock, title: 'Protecting your privacy', color: 'bg-accent/20 text-accent' },
  { icon: Car, title: 'Staying safe on every ride', color: 'bg-accent/20 text-accent' },
  { icon: AlertTriangle, title: 'Accidents: Steps to take', color: 'bg-yellow-500/20 text-yellow-600' },
];

export default function SafetyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMapp = location.pathname.startsWith('/mapp');

  return (
    <div className={`min-h-[100dvh] bg-background flex flex-col ${isMapp ? '' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        {!isMapp && (
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground text-sm">
            ← Back
          </button>
        )}
        <div className={`flex items-center gap-2 ${isMapp ? 'mx-auto' : ''}`}>
          <KoloiLogo size="sm" iconOnly />
          <h1 className="font-bold text-lg text-foreground">Safety</h1>
        </div>
        {!isMapp && <div className="w-12" />}
      </div>

      <div className="flex-1 px-5 py-6 space-y-6">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-muted/50 hover:bg-muted transition-colors">
            <MessageSquare className="w-6 h-6 text-foreground" />
            <span className="text-sm font-medium text-foreground">Support</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-muted/50 hover:bg-muted transition-colors">
            <Users className="w-6 h-6 text-foreground" />
            <span className="text-sm font-medium text-foreground">Emergency contacts</span>
          </button>
        </div>

        {/* Emergency call */}
        <a
          href="tel:995"
          className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-lg hover:bg-destructive/90 transition-colors"
        >
          <Phone className="w-5 h-5" />
          Call 995
        </a>

        {/* How you're protected */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">How you're protected</h2>
          <div className="grid grid-cols-2 gap-3">
            {protectionCards.map((card) => (
              <button
                key={card.title}
                className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors text-left group"
              >
                <span className="text-sm font-semibold text-foreground leading-tight">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl ${card.color} self-end`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
