-- Add vehicle_type column to rides table
ALTER TABLE public.rides 
ADD COLUMN vehicle_type TEXT NOT NULL DEFAULT 'economy';

-- Add index for faster queries by vehicle type
CREATE INDEX idx_rides_vehicle_type ON public.rides(vehicle_type);