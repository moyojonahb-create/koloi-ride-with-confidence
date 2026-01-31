-- Create offers table for driver bidding
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL,
  price NUMERIC NOT NULL,
  eta_minutes INTEGER DEFAULT 10,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for ride communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for offers and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Offers policies
CREATE POLICY "Drivers can view offers for pending rides"
ON public.offers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM drivers d 
    WHERE d.user_id = auth.uid() 
    AND d.status = 'approved'
  )
);

CREATE POLICY "Drivers can create offers"
ON public.offers FOR INSERT
WITH CHECK (
  driver_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM drivers d 
    WHERE d.user_id = auth.uid() 
    AND d.status = 'approved'
  )
);

CREATE POLICY "Riders can view offers on their rides"
ON public.offers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rides r 
    WHERE r.id = ride_id 
    AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Riders can update offers on their rides"
ON public.offers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM rides r 
    WHERE r.id = ride_id 
    AND r.user_id = auth.uid()
  )
);

-- Messages policies
CREATE POLICY "Riders can view messages for their rides"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rides r 
    WHERE r.id = ride_id 
    AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can view messages for their assigned rides"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rides r 
    JOIN drivers d ON d.id = r.driver_id
    WHERE r.id = ride_id 
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Riders can send messages on their rides"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM rides r 
    WHERE r.id = ride_id 
    AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can send messages on their assigned rides"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM rides r 
    JOIN drivers d ON d.id = r.driver_id
    WHERE r.id = ride_id 
    AND d.user_id = auth.uid()
  )
);