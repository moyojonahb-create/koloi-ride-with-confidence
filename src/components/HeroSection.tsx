import { useState } from 'react';
import { MapPin, ChevronDown, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KoloiLogo from '@/components/KoloiLogo';

const HeroSection = () => {
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [fareOffer, setFareOffer] = useState('50');
  const [vehicleType, setVehicleType] = useState('Car');

  return (
    <section className="relative bg-background py-12 lg:py-20">
      <div className="koloi-container">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          {/* Left Side - Hero Content */}
          <div className="w-full lg:w-1/2 mb-12 lg:mb-0">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-display font-bold text-foreground mb-6 leading-tight italic">
              Get picked.<br />Get moving.
            </h1>

            <p className="text-muted-foreground text-lg mb-8 max-w-md">
              Koloi is a local ride app built for quick, fair, and reliable rides in town.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button className="koloi-btn-primary">
                Request a Ride
              </Button>
              <Button className="koloi-btn-secondary">
                Drive with Koloi
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="text-accent">🤝</span> Trusted locally
              </span>
              <span>✦</span>
              <span>Fast • Fair • Local</span>
            </div>
          </div>

          {/* Right Side - Phone Mockup */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
            <div className="relative">
              {/* Phone Frame */}
              <div className="w-[300px] sm:w-[320px] bg-primary rounded-[40px] p-3 shadow-koloi-xl">
                {/* Phone Notch */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-20 h-6 bg-primary rounded-full z-10"></div>
                
                {/* Phone Screen */}
                <div className="bg-background rounded-[32px] p-6 min-h-[500px]">
                  {/* App Logo */}
                  <div className="flex justify-center mb-6 pt-4">
                    <KoloiLogo size="md" />
                  </div>

                  {/* Booking Card */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-display font-semibold text-foreground text-center">
                      Where are you go?
                    </h2>

                    {/* Pickup Input */}
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Enter pickup location"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        className="koloi-input pl-10 h-11 text-sm"
                      />
                    </div>

                    {/* Dropoff Input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                        <div className="w-2 h-2 bg-foreground"></div>
                      </div>
                      <input
                        type="text"
                        placeholder="Where to?"
                        value={dropoffLocation}
                        onChange={(e) => setDropoffLocation(e.target.value)}
                        className="koloi-input pl-10 h-11 text-sm"
                      />
                    </div>

                    {/* Fare and Vehicle Row */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Fare Offer */}
                      <div className="border border-border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">OFFER FARE (R)</div>
                        <input
                          type="text"
                          value={`R ${fareOffer}`}
                          onChange={(e) => setFareOffer(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full text-foreground font-semibold bg-transparent focus:outline-none"
                        />
                      </div>

                      {/* Vehicle Type */}
                      <div className="border border-border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">VEHICLE</div>
                        <div className="flex items-center justify-between">
                          <span className="text-foreground font-semibold">{vehicleType}</span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Find Drivers Button */}
                    <Button className="koloi-btn-primary w-full">
                      FIND DRIVERS
                    </Button>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -z-10 top-10 -right-10 w-32 h-32 bg-accent/20 rounded-full blur-3xl"></div>
              <div className="absolute -z-10 bottom-10 -left-10 w-24 h-24 bg-accent/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
