import { useState, useMemo } from 'react';
import { MapPinned, ArrowRight, Users, Clock, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TOWNS } from '@/lib/towns';
import { getRoutesFromTown, calcIntercityFare, type IntercityRoute } from '@/lib/intercityRoutes';
import { motion } from 'framer-motion';

interface IntercitySelectorProps {
  currentTownId: string;
  onSelectRoute: (route: IntercityRoute & { fare: number }) => void;
}

export default function IntercitySelector({ currentTownId, onSelectRoute }: IntercitySelectorProps) {
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [passengers, setPassengers] = useState(1);

  const routes = useMemo(() => getRoutesFromTown(currentTownId), [currentTownId]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.to === selectedDestination),
    [routes, selectedDestination]
  );

  const pricing = useMemo(
    () => selectedRoute ? calcIntercityFare(selectedRoute, passengers) : null,
    [selectedRoute, passengers]
  );

  const destinationTowns = useMemo(
    () => routes.map((r) => {
      const town = TOWNS.find((t) => t.id === r.to);
      return { id: r.to, name: town?.name || r.to, popular: r.popular };
    }),
    [routes]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPinned className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">Intercity Trip</h3>
      </div>

      {/* Destination */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Destination City</label>
        <Select value={selectedDestination} onValueChange={setSelectedDestination}>
          <SelectTrigger>
            <SelectValue placeholder="Choose destination" />
          </SelectTrigger>
          <SelectContent>
            {destinationTowns.filter((t) => t.popular).length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Popular</div>
                {destinationTowns.filter((t) => t.popular).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Other</div>
              </>
            )}
            {destinationTowns.filter((t) => !t.popular).map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Passengers */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Passengers</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setPassengers(n)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                passengers === n
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Route info */}
      {selectedRoute && pricing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 space-y-3"
          style={{ borderRadius: 14 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="capitalize">{TOWNS.find((t) => t.id === currentTownId)?.name}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="capitalize">{TOWNS.find((t) => t.id === selectedDestination)?.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <Navigation className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs font-bold text-foreground">{selectedRoute.distanceKm} km</p>
              <p className="text-[10px] text-muted-foreground">Distance</p>
            </div>
            <div>
              <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs font-bold text-foreground">{selectedRoute.durationHrs}h</p>
              <p className="text-[10px] text-muted-foreground">Duration</p>
            </div>
            <div>
              <MapPinned className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-xs font-bold text-foreground">${pricing.baseFare.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Base Fare</p>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground text-center">
            Negotiate between ${pricing.minOffer.toFixed(2)} – ${pricing.maxOffer.toFixed(2)}
          </div>

          <Button
            className="w-full font-bold"
            onClick={() => onSelectRoute({ ...selectedRoute, fare: pricing.baseFare })}
          >
            Request Intercity Ride – ${pricing.baseFare.toFixed(2)}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
