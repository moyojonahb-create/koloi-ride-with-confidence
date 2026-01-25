-- Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create drivers table
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'banned')),
  vehicle_type text NOT NULL DEFAULT 'economy' CHECK (vehicle_type IN ('economy', 'standard', 'premium', 'van')),
  plate_number text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  rating_avg numeric(3,2) DEFAULT 0,
  total_trips integer DEFAULT 0,
  is_online boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- RLS policies for drivers
CREATE POLICY "Drivers can view their own profile"
ON public.drivers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update their own profile"
ON public.drivers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Drivers can insert their own profile"
ON public.drivers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all drivers"
ON public.drivers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all drivers"
ON public.drivers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create driver_documents table
CREATE TABLE public.driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('license', 'registration', 'insurance', 'id_card')),
  file_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on driver_documents
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for driver_documents
CREATE POLICY "Drivers can view their own documents"
ON public.driver_documents
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.drivers d
  WHERE d.id = driver_id AND d.user_id = auth.uid()
));

CREATE POLICY "Drivers can upload their own documents"
ON public.driver_documents
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.drivers d
  WHERE d.id = driver_id AND d.user_id = auth.uid()
));

CREATE POLICY "Admins can view all documents"
ON public.driver_documents
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all documents"
ON public.driver_documents
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create live_locations table for real-time tracking
CREATE TABLE public.live_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_type text NOT NULL CHECK (user_type IN ('driver', 'rider')),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  heading double precision,
  speed double precision,
  is_online boolean DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on live_locations
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_locations
CREATE POLICY "Users can view their own location"
ON public.live_locations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own location"
ON public.live_locations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own location"
ON public.live_locations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all locations"
ON public.live_locations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create trip_events table for audit trail
CREATE TABLE public.trip_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL CHECK (event_type IN ('created', 'accepted', 'started', 'completed', 'cancelled', 'admin_cancelled', 'driver_assigned', 'location_update')),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on trip_events
ALTER TABLE public.trip_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for trip_events
CREATE POLICY "Users can view events for their rides"
ON public.trip_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.rides r
  WHERE r.id = ride_id AND r.user_id = auth.uid()
));

CREATE POLICY "Admins can view all trip events"
ON public.trip_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage trip events"
ON public.trip_events
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('info', 'warning', 'success', 'error', 'system')),
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create system_events table for admin logs
CREATE TABLE public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on system_events
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_events
CREATE POLICY "Admins can view system events"
ON public.system_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create system events"
ON public.system_events
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add driver_id to rides table for assigned driver
ALTER TABLE public.rides ADD COLUMN driver_id uuid REFERENCES public.drivers(id);

-- Enable realtime for live_locations and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create triggers for updated_at columns
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_documents_updated_at
  BEFORE UPDATE ON public.driver_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_live_locations_updated_at
  BEFORE UPDATE ON public.live_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();