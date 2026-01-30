import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PhoneMockup from '@/components/PhoneMockup';
import koloiLogo from '@/assets/koloi-logo-official.png';

interface LandingHeroProps {
  onGetStarted?: () => void;
}

const LandingHero = ({ onGetStarted }: LandingHeroProps) => {
  const navigate = useNavigate();
  return (
    <section className="min-h-screen bg-primary flex flex-col pt-16 lg:pt-20">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:py-16">
        {/* Logo - Large and Prominent */}
        <div className="mb-8 sm:mb-12 animate-fade-in">
          <img 
            src={koloiLogo} 
            alt="Koloi - Get picked. Get moving." 
            className="w-64 sm:w-80 md:w-96 h-auto"
          />
        </div>

        {/* Tagline with Yellow Accent */}
        <div className="text-center mb-10 sm:mb-14 animate-slide-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground mb-3">
            Get picked.{' '}
            <span className="relative inline-block">
              Get moving.
              <span className="absolute -bottom-2 left-0 w-full h-1.5 bg-accent rounded-full" />
            </span>
          </h1>
          <p className="text-primary-foreground/80 text-lg sm:text-xl mt-6 max-w-md mx-auto">
            Safe, reliable rides at your fingertips. Book in seconds, ride in minutes.
          </p>
        </div>

        {/* Phone Mockup */}
        <div className="mb-10 sm:mb-14 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <PhoneMockup />
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-none sm:w-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Button 
            onClick={() => navigate('/ride')}
            className="h-14 px-8 bg-accent text-accent-foreground font-bold text-lg rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
          >
            Request a Ride
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button 
            onClick={onGetStarted}
            variant="outline"
            className="h-14 px-8 bg-transparent border-2 border-primary-foreground/30 text-primary-foreground font-semibold text-lg rounded-xl hover:bg-primary-foreground/10 active:scale-[0.98] transition-all"
          >
            Sign Up
          </Button>
        </div>
      </div>

      {/* Bottom Trust Indicators */}
      <div className="pb-8 px-6">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-primary-foreground/60 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span>50,000+ rides completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span>Gwanda & surrounds</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span>24/7 support</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
