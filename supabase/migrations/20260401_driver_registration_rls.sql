-- Driver Registration RLS Policies
-- To apply: npm i -g supabase (if not installed)
-- supabase login
-- supabase link --project-ref jidfganntquilvsytslp
-- supabase db push

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

-- Drivers
DROP POLICY IF EXISTS "user insert driver" ON drivers;
CREATE POLICY "Users can insert own driver record" ON drivers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user select driver" ON drivers;
CREATE POLICY "Users can select own driver record" ON drivers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user update driver" ON drivers;
CREATE POLICY "Users can update own driver record" ON drivers FOR UPDATE USING (auth.uid() = user_id);

-- Driver documents
DROP POLICY IF EXISTS "user insert documents" ON driver_documents;
CREATE POLICY "Users can insert driver documents" ON driver_documents FOR INSERT WITH CHECK (exists (SELECT 1 FROM drivers WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = auth.uid()));

DROP POLICY IF EXISTS "user select documents" ON driver_documents;
CREATE POLICY "Users can select driver documents" ON driver_documents FOR SELECT USING (exists (SELECT 1 FROM drivers WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = auth.uid()));

-- Storage bucket 'driver-documents' needs to be created in dashboard if missing
-- Policy: public bucket with authenticated upload to user path

