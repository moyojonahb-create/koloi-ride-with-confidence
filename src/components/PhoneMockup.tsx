import { MapPin, Navigation2 } from 'lucide-react';

const PhoneMockup = () => {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px]">
      {/* Phone Frame */}
      <div className="relative bg-foreground rounded-[3rem] p-3 shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.35)]">
        {/* Screen bezel */}
        <div className="relative bg-background rounded-[2.5rem] overflow-hidden">
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-foreground rounded-full z-20" />
          
          {/* Status bar */}
          <div className="bg-background px-6 py-3 flex items-center justify-between pt-4">
            <span className="text-xs font-semibold text-muted-foreground">9:41</span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <div className="w-1 h-2 bg-muted-foreground rounded-sm" />
                <div className="w-1 h-2.5 bg-muted-foreground rounded-sm" />
                <div className="w-1 h-3 bg-muted-foreground rounded-sm" />
                <div className="w-1 h-3.5 bg-border rounded-sm" />
              </div>
              <div className="w-6 h-3 bg-muted-foreground rounded-sm ml-1" />
            </div>
          </div>

          {/* Map Area */}
          <div className="relative h-[300px] sm:h-[360px] bg-gradient-to-br from-secondary via-background to-secondary">
            {/* Map grid */}
            <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            
            {/* Route line */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary-light))" />
                </linearGradient>
              </defs>
              <path
                d="M 80 260 Q 120 180, 160 160 T 220 90"
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="5"
                strokeLinecap="round" />
            </svg>

            {/* Pickup Pin */}
            <div className="absolute left-[60px] bottom-[70px] animate-fade-in">
              <div className="relative">
                <div className="w-11 h-11 bg-accent rounded-full flex items-center justify-center shadow-md ring-4 ring-accent/20">
                  <MapPin className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rotate-45 -z-10" />
              </div>
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-foreground whitespace-nowrap bg-card px-2 py-1 rounded-full shadow-sm">
                Pickup
              </span>
            </div>

            {/* Destination Pin */}
            <div className="absolute right-[40px] top-[50px] animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="relative">
                <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center shadow-md ring-4 ring-primary/20">
                  <Navigation2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 -z-10" />
              </div>
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-foreground whitespace-nowrap bg-card px-2 py-1 rounded-full shadow-sm">
                Drop-off
              </span>
            </div>

            {/* Car indicator */}
            <div className="absolute left-[130px] top-[150px]">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
                <div className="w-9 h-9 bg-card rounded-full shadow-md flex items-center justify-center rotate-45">
                  <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Ride Card */}
          <div className="bg-card p-5 rounded-t-3xl -mt-6 relative z-10 shadow-lg">
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />
            
            <div className="space-y-2.5 mb-5">
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-2xl">
                <div className="w-3 h-3 rounded-full bg-accent shadow-sm" />
                <span className="text-sm text-foreground font-medium">Harare City</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-2xl">
                <div className="w-3 h-3 rounded-full bg-primary shadow-sm" />
                <span className="text-sm text-foreground font-medium">Bulawayo City</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-foreground">$5</p>
                <p className="text-xs text-muted-foreground">2.1 km • 6 min</p>
              </div>
              <button className="px-6 py-3 bg-accent text-accent-foreground font-bold rounded-full text-sm shadow-sm hover:brightness-105 transition-all">
                Request Ride
              </button>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-muted-foreground/40 rounded-full" />
      </div>
    </div>
  );
};

export default PhoneMockup;
