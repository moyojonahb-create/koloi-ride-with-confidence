import { ArrowRight, Star, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PhoneMockup from '@/components/PhoneMockup';
import koloiLogo from '@/assets/koloi-logo-official.png';
import { TOWNS } from '@/lib/towns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
interface LandingHeroProps {
  onGetStarted?: () => void;
}
const LandingHero = ({
  onGetStarted
}: LandingHeroProps) => {
  const navigate = useNavigate();
  return <section className="min-h-screen bg-primary flex flex-col pt-16 lg:pt-20 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:py-16">
        {/* Logo - Large and Prominent */}
        <div className="mb-8 sm:mb-10 animate-fade-in">
          
        </div>

        {/* Tagline with Yellow Accent */}
        <div className="text-center mb-8 sm:mb-12 animate-slide-up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground mb-4 tracking-tight">
            Get picked.{' '}
            <span className="relative inline-block">Get moving.<span className="absolute -bottom-2 left-0 w-full h-2 bg-accent rounded-full" />
            </span>
          </h1>
          <p className="text-primary-foreground/80 text-lg sm:text-xl mt-6 max-w-lg mx-auto leading-relaxed">
            Safe, reliable rides at your fingertips. Book in seconds, ride in minutes.
          </p>
        </div>

        {/* Phone Mockup with glow effect */}
        <div className="relative mb-8 sm:mb-12 animate-slide-up" style={{
        animationDelay: '0.1s'
      }}>
          {/* Subtle glow behind phone */}
          <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full scale-75 -z-10" />
          <PhoneMockup />
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-none sm:w-auto animate-slide-up" style={{
        animationDelay: '0.2s'
      }}>
          <Button onClick={() => navigate('/ride')} variant="accent" size="lg" className="shadow-koloi-glow">
            Request a Ride
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button onClick={onGetStarted} variant="outline" size="lg" className="bg-transparent border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
            Sign Up Free
          </Button>
        </div>
      </div>

      {/* Town Selector + Trust Indicators */}
      <div className="pb-8 px-6 space-y-4">
        {/* Town Selector */}
        <div className="flex justify-center">
          <Select defaultValue="gwanda">
            <SelectTrigger className="w-56 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground rounded-full h-10 focus:ring-accent">
              <MapPin className="w-4 h-4 mr-2 text-accent" />
              <SelectValue placeholder="Select your town" />
            </SelectTrigger>
            <SelectContent className="bg-background border rounded-xl z-50">
              {TOWNS.map((town) => (
                <SelectItem key={town.id} value={town.id} className="cursor-pointer">
                  {town.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full">
            <Star className="w-4 h-4 text-accent fill-accent" />
            <span className="text-primary-foreground/90 text-sm font-medium">Join us today</span>
          </div>
          <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-primary-foreground/90 text-sm font-medium">Gwanda & Beitbridge</span>
          </div>
          <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full">
            <span className="text-primary-foreground/90 text-sm font-medium">24/7 support</span>
          </div>
        </div>
      </div>
    </section>;
};
export default LandingHero;