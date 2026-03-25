import { ArrowRight, Star, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PhoneMockup from '@/components/PhoneMockup';
import { TOWNS } from '@/lib/towns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LandingHeroProps {
  onGetStarted?: () => void;
}

const LandingHero = ({ onGetStarted }: LandingHeroProps) => {
  const navigate = useNavigate();
  return (
    <section className="min-h-screen bg-primary flex flex-col pt-16 lg:pt-20 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:py-16">
        <div className="mb-10 animate-fade-in" />

        <div className="text-center mb-10 animate-slide-up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-primary-foreground mb-4 tracking-tighter">
            Your ride,{' '}
            <span className="relative inline-block">your way.<span className="absolute -bottom-2 left-0 w-full h-2.5 bg-accent rounded-full" /></span>
          </h1>
          <p className="text-primary-foreground/80 text-lg sm:text-xl mt-7 max-w-md mx-auto leading-relaxed">
            Safe, reliable rides at your fingertips. Book in seconds, ride in minutes.
          </p>
        </div>

        <div className="relative mb-10 animate-spring" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full scale-75 -z-10" />
          <PhoneMockup />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-none sm:w-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Button onClick={() => navigate('/ride')} variant="accent" size="lg" className="bg-accent shadow-[var(--shadow-glow)] h-[52px] text-[15px] font-bold active:scale-[0.97] transition-all">
            Request a Ride
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button onClick={onGetStarted} variant="outline" size="lg" className="bg-transparent border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-[52px] text-[15px] font-bold active:scale-[0.97] transition-all">
            Sign Up Free
          </Button>
        </div>
      </div>

      <div className="pb-10 px-6 space-y-5">
        <div className="flex justify-center">
          <Select defaultValue="gwanda">
            <SelectTrigger className="w-56 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground rounded-full h-11 focus:ring-accent">
              <MapPin className="w-4 h-4 mr-2 text-accent" />
              <SelectValue placeholder="Select your city" />
            </SelectTrigger>
            <SelectContent className="bg-background border rounded-2xl z-50">
              {TOWNS.map((town) => (
                <SelectItem key={town.id} value={town.id} className="cursor-pointer rounded-xl">{town.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2.5 rounded-full">
            <Star className="w-4 h-4 text-accent fill-accent" />
            <span className="text-primary-foreground/90 text-[13px] font-semibold">Join PickMe today</span>
          </div>
          <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-primary-foreground/90 text-[13px] font-semibold">Nationwide Zimbabwe</span>
          </div>
          <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2.5 rounded-full">
            <span className="text-primary-foreground/90 text-[13px] font-semibold">24/7 support</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
