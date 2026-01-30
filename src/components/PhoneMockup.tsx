import { MapPin, Navigation2 } from 'lucide-react';

const PhoneMockup = () => {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px]">
      {/* Phone Frame */}
      <div className="relative bg-koloi-gray-900 rounded-[3rem] p-3 shadow-koloi-phone">
        {/* Screen bezel */}
        <div className="relative bg-koloi-gray-100 rounded-[2.25rem] overflow-hidden">
          {/* Status bar */}
          <div className="bg-koloi-gray-100 px-6 py-2 flex items-center justify-between">
            <span className="text-xs font-medium text-koloi-gray-700">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-koloi-gray-700 rounded-sm" />
            </div>
          </div>

          {/* Map Area */}
          <div className="relative h-[320px] sm:h-[380px] bg-gradient-to-b from-koloi-gray-200 to-koloi-gray-300">
            {/* Simplified map grid lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-koloi-gray-500"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            
            {/* Route line */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M 80 280 Q 120 200, 160 180 T 220 100" 
                fill="none" 
                stroke="hsl(215 80% 45%)" 
                strokeWidth="4" 
                strokeLinecap="round"
                strokeDasharray="0"
              />
            </svg>

            {/* Pickup Pin - Yellow */}
            <div className="absolute left-[60px] bottom-[60px]">
              <div className="relative">
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg">
                  <MapPin className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent rotate-45 -z-10" />
              </div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-koloi-gray-700 whitespace-nowrap bg-white/80 px-1.5 py-0.5 rounded">
                Pickup
              </span>
            </div>

            {/* Destination Pin - Blue */}
            <div className="absolute right-[40px] top-[60px]">
              <div className="relative">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <Navigation2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45 -z-10" />
              </div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-koloi-gray-700 whitespace-nowrap bg-white/80 px-1.5 py-0.5 rounded">
                Drop-off
              </span>
            </div>

            {/* Car indicator on route */}
            <div className="absolute left-[130px] top-[160px]">
              <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center rotate-45">
                <svg className="w-5 h-5 text-koloi-gray-800" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom Ride Card */}
          <div className="bg-white p-4 rounded-t-2xl -mt-4 relative z-10">
            {/* Handle */}
            <div className="w-10 h-1 bg-koloi-gray-300 rounded-full mx-auto mb-3" />
            
            {/* Location inputs */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-3 p-2.5 bg-koloi-gray-100 rounded-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-sm text-koloi-gray-700 font-medium">Gwanda Rank</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-koloi-gray-100 rounded-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-sm text-koloi-gray-700 font-medium">Phakama Shops</span>
              </div>
            </div>

            {/* Fare and CTA */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">R35</p>
                <p className="text-xs text-muted-foreground">2.1 km • 6 min</p>
              </div>
              <button className="px-6 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg text-sm">
                Request Ride
              </button>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-koloi-gray-600 rounded-full" />
      </div>
    </div>
  );
};

export default PhoneMockup;
