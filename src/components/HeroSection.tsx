import { useState } from 'react';
import { MapPin, Calendar, ChevronDown, Navigation, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-illustration.jpg';

const HeroSection = () => {
  const [pickupType, setPickupType] = useState<'now' | 'later'>('now');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);

  return (
    <section className="relative bg-background">
      <div className="koloi-container py-8 lg:py-16">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">
          {/* Left Side - Ride Request Card */}
          <div className="w-full lg:w-[480px] shrink-0 z-10">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 lg:mb-8 leading-tight">
              Get picked. Get moving.
            </h1>

            <div className="bg-card rounded-xl shadow-koloi-card p-6 animate-slide-up">
              {/* Pickup Type Selector */}
              <div className="relative mb-4">
                <button
                  onClick={() => setShowPickupDropdown(!showPickupDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full hover:bg-koloi-gray-300 transition-colors"
                >
                  {pickupType === 'now' ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Pickup now</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Schedule for later</span>
                    </>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showPickupDropdown && (
                  <div className="absolute top-full left-0 mt-2 bg-card rounded-lg shadow-koloi-lg border border-border overflow-hidden z-20 animate-fade-in">
                    <button
                      onClick={() => {
                        setPickupType('now');
                        setShowPickupDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3 ${
                        pickupType === 'now' ? 'bg-secondary' : ''
                      }`}
                    >
                      <Clock className="w-5 h-5" />
                      <span>Pickup now</span>
                    </button>
                    <button
                      onClick={() => {
                        setPickupType('later');
                        setShowPickupDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3 ${
                        pickupType === 'later' ? 'bg-secondary' : ''
                      }`}
                    >
                      <Calendar className="w-5 h-5" />
                      <span>Schedule for later</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Location Inputs */}
              <div className="space-y-3">
                {/* Pickup Location */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rounded-full" />
                  <input
                    type="text"
                    placeholder="Pickup location"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="koloi-input pl-10 pr-10"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-koloi-gray-200 rounded-lg transition-colors">
                    <Navigation className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Dropoff Location */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-foreground" />
                  <input
                    type="text"
                    placeholder="Dropoff location"
                    value={dropoffLocation}
                    onChange={(e) => setDropoffLocation(e.target.value)}
                    className="koloi-input pl-10"
                  />
                </div>
              </div>

              {/* See Prices Button */}
              <Button className="koloi-btn-primary w-full mt-4">
                See prices
              </Button>

              {/* Login Link */}
              <p className="text-center text-muted-foreground text-sm mt-4">
                <button className="text-foreground underline underline-offset-2 hover:no-underline">
                  Log in
                </button>{' '}
                to see your recent activity
              </p>
            </div>
          </div>

          {/* Right Side - Hero Image */}
          <div className="hidden lg:block flex-1 relative mt-8 lg:mt-0">
            <div className="relative rounded-2xl overflow-hidden shadow-koloi-xl">
              <img
                src={heroImage}
                alt="Koloi ride service"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Hero Image */}
      <div className="lg:hidden mt-8 px-4">
        <div className="rounded-2xl overflow-hidden shadow-koloi-lg">
          <img
            src={heroImage}
            alt="Koloi ride service"
            className="w-full h-64 object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
