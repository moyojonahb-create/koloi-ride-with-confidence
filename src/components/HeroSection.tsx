import { useState } from 'react';
import { Calendar, ChevronDown, Clock, Map, Navigation2, Timer, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RideMap from '@/components/RideMap';
import LocationInput from '@/components/LocationInput';

interface RouteInfo {
  distance: number;
  duration: number;
  fare: number;
}

const HeroSection = () => {
  const [pickupType, setPickupType] = useState<'now' | 'later'>('now');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  
  // Map coordinates
  const [pickupCoords, setPickupCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lng: number; lat: number } | null>(null);

  const handleMapLocationSelect = (location: { lng: number; lat: number }, type: 'pickup' | 'dropoff') => {
    if (type === 'pickup') {
      setPickupCoords(location);
      setPickupLocation(`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
    } else {
      setDropoffCoords(location);
      setDropoffLocation(`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
    }
  };

  const handlePickupSelect = (location: { name: string; lng: number; lat: number }) => {
    setPickupLocation(location.name);
    setPickupCoords({ lng: location.lng, lat: location.lat });
  };

  const handleDropoffSelect = (location: { name: string; lng: number; lat: number }) => {
    setDropoffLocation(location.name);
    setDropoffCoords({ lng: location.lng, lat: location.lat });
  };

  const handleRouteCalculated = (info: RouteInfo | null) => {
    setRouteInfo(info);
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lng: position.coords.longitude,
            lat: position.coords.latitude,
          };
          setPickupCoords(coords);
          setPickupLocation('My Current Location');
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to Gwanda center
          const defaultCoords = { lng: 29.0147, lat: -20.9389 };
          setPickupCoords(defaultCoords);
          setPickupLocation('Gwanda Town Center');
        }
      );
    }
  };

  return (
    <section className="relative bg-background">
      <div className="koloi-container py-8 lg:py-16">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12">
          {/* Left Side - Ride Request Card */}
          <div className="w-full lg:w-[420px] shrink-0 z-10">
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
                <LocationInput
                  placeholder="Where are you?"
                  value={pickupLocation}
                  onChange={setPickupLocation}
                  onLocationSelect={handlePickupSelect}
                  onUseMyLocation={handleUseMyLocation}
                  showMyLocation={true}
                  markerType="pickup"
                />

                {/* Dropoff Location */}
                <LocationInput
                  placeholder="Where to?"
                  value={dropoffLocation}
                  onChange={setDropoffLocation}
                  onLocationSelect={handleDropoffSelect}
                  markerType="dropoff"
                />
              </div>

              {/* Fare Estimate Card */}
              {routeInfo && (
                <div className="mt-4 p-4 bg-accent/10 rounded-xl border border-accent/20 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Estimated Fare</span>
                    <span className="text-2xl font-bold text-foreground">R{routeInfo.fare}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Navigation2 className="w-4 h-4 text-accent" />
                      <span>{routeInfo.distance} km</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Timer className="w-4 h-4 text-accent" />
                      <span>{routeInfo.duration} min</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Banknote className="w-3 h-3" />
                    Starting fare R50 + R4/km
                  </p>
                </div>
              )}

              {/* Request Ride Button */}
              <Button className="koloi-btn-primary w-full mt-4" disabled={!routeInfo}>
                {routeInfo ? `Request Ride - R${routeInfo.fare}` : 'Select pickup & dropoff'}
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

          {/* Right Side - Interactive Map */}
          <div className="flex-1 mt-8 lg:mt-0">
            <RideMap
              pickupLocation={pickupCoords}
              dropoffLocation={dropoffCoords}
              onLocationSelect={handleMapLocationSelect}
              onRouteCalculated={handleRouteCalculated}
              className="h-[400px] lg:h-[500px] shadow-koloi-xl"
            />
          </div>
        </div>
      </div>

      {/* Mobile Map Toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-30">
        <Button 
          onClick={() => setShowMap(!showMap)}
          className="w-14 h-14 rounded-full shadow-koloi-xl koloi-btn-primary"
        >
          <Map className="w-6 h-6" />
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;
