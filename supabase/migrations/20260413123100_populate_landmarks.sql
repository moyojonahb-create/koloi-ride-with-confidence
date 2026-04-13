-- Populate koloi_landmarks with data from gwanda-osm-places.json
-- This migration inserts landmarks for Gwanda and surrounding areas

INSERT INTO public.koloi_landmarks (name, category, latitude, longitude, description, keywords, is_active) VALUES
-- Towns and areas
('Gwanda', 'Town', -20.9414292, 29.0036855, 'Provincial capital of Matabeleland South', ARRAY['gwanda', 'town', 'capital', 'matabeleland'], true),

-- Shopping centers and markets
('NASSA Complex', 'Shopping', -20.9449361, 29.0070537, 'Shopping mall in Gwanda', ARRAY['nassa', 'mall', 'shopping', 'complex'], true),
('Jahunda Shopping Center', 'Shopping', -20.9419227, 29.0141708, 'Shopping center in Gwanda', ARRAY['jahunda', 'shopping', 'center', 'mall'], true),
('Ultra Shopping Center', 'Shopping', -20.9437091, 29.0308485, 'Shopping center in Gwanda', ARRAY['ultra', 'shopping', 'center', 'mall'], true),
('Emabhizeni', 'Market', -20.9415, 29.015, 'Marketplace in Gwanda', ARRAY['emabhizeni', 'market', 'marketplace'], true),

-- Schools and educational institutions
('Senondo Primary School', 'School', -20.9428365, 29.0274485, 'Primary school in Gwanda', ARRAY['senondo', 'primary', 'school', 'education'], true),
('Joshua Mqabuko Nkomo Gwanda Polytechnical College', 'University', -20.9517011, 29.0118487, 'Technical college in Gwanda', ARRAY['joshua', 'mqabuko', 'nkomo', 'polytechnic', 'college', 'university'], true),
('Zimbabwe Open University', 'University', -20.9331799, 29.0027281, 'University campus in Gwanda', ARRAY['zou', 'zimbabwe', 'open', 'university', 'education'], true),
('Sabiwa', 'School', -20.8749784, 28.9241043, 'School in Gwanda area', ARRAY['sabiwa', 'school'], true),
('Nkazhi Primary School', 'School', -20.8494778, 29.1392319, 'Primary school near Gwanda', ARRAY['nkazhi', 'primary', 'school'], true),
('Nkazhi Secondary School', 'School', -20.8502975, 29.1376789, 'Secondary school near Gwanda', ARRAY['nkazhi', 'secondary', 'school'], true),
('Dombosho Primary School', 'School', -20.7989355, 29.0587217, 'Primary school near Gwanda', ARRAY['dombosho', 'primary', 'school'], true),
('JOSHUA MQABUKO POLYTECHNIC OLD SIDE CAMPUS', 'College', -20.9347609, 29.0299493, 'Polytechnic campus', ARRAY['joshua', 'mqabuko', 'polytechnic', 'campus', 'college'], true),

-- Churches and religious places
('BICC Spitzkop North', 'Church', -20.9313819, 29.0320396, 'Church in Spitzkop North', ARRAY['bicc', 'spitzkop', 'north', 'church', 'christian'], true),
('AFM Spitzkop North', 'Church', -20.9301326, 29.0303881, 'Apostolic Faith Mission church', ARRAY['afm', 'spitzkop', 'north', 'church', 'apostolic'], true),
('ASSEMBLIES OF GOD', 'Church', -20.9240076, 29.0269195, 'Assemblies of God church', ARRAY['assemblies', 'god', 'church', 'christian'], true),

-- Government and offices
('OPC Mat-South Building', 'Government', -20.9409992, 29.0101201, 'Provincial government building', ARRAY['opc', 'mat', 'south', 'government', 'provincial'], true),
('ZTDC Gwanda Off Town', 'Office', -20.9336916, 29.0059028, 'ZTDC office in Gwanda', ARRAY['ztdc', 'office', 'gwanda'], true),

-- Recreation and leisure
('Gwanda Public Swimming Pool', 'Leisure', -20.9436773, 29.0014084, 'Public swimming pool', ARRAY['gwanda', 'swimming', 'pool', 'leisure', 'recreation'], true),
('Gwanda Airport', 'Transport', -20.8990876, 29.0009912, 'Gwanda Airport', ARRAY['gwanda', 'airport', 'transport', 'aviation'], true),

-- Roads and streets
('Phakama Road', 'Road', -20.9436339, 29.0232103, 'Major road in Gwanda', ARRAY['phakama', 'road', 'street'], true),
('Geniva Road', 'Road', -20.9429343, 29.0155329, 'Road in Gwanda', ARRAY['geniva', 'road', 'street'], true),
('Spitzkop Road', 'Road', -20.9387631, 29.0724101, 'Road to Spitzkop area', ARRAY['spitzkop', 'road', 'street'], true),
('2nd Avenue', 'Road', -20.9400416, 29.0033442, 'Street in Gwanda', ARRAY['2nd', 'avenue', 'second', 'street'], true),
('1st Avenue', 'Road', -20.9395701, 29.0025228, 'Street in Gwanda', ARRAY['1st', 'avenue', 'first', 'street'], true),
('3rd Avenue', 'Road', -20.9414582, 29.0036068, 'Street in Gwanda', ARRAY['3rd', 'avenue', 'third', 'street'], true),
('Lawley street', 'Road', -20.9426935, 29.0036735, 'Street in Gwanda', ARRAY['lawley', 'street', 'road'], true),
('Jacaranda Way', 'Road', -20.9330729, 29.0069975, 'Road in Gwanda', ARRAY['jacaranda', 'way', 'road', 'street'], true),
('Marriage Phakathi Road', 'Road', -20.9411554, 29.0221209, 'Road in Gwanda', ARRAY['marriage', 'phakathi', 'road'], true),
('Gwanda Show Grounds way', 'Road', -20.931248, 29.0020522, 'Road to show grounds', ARRAY['gwanda', 'show', 'grounds', 'road'], true),
('Gwanda Show Grounds Road', 'Road', -20.9304751, 29.0017051, 'Road to show grounds', ARRAY['gwanda', 'show', 'grounds', 'road'], true),
('Byo - GDA-BB road', 'Road', -20.9412566, 29.006115, 'Bulawayo to Gwanda to Beitbridge road', ARRAY['byo', 'bulawayo', 'gwanda', 'beitbridge', 'road', 'highway', 'a6'], true),

-- Infrastructure
('Gwanda Substation', 'Infrastructure', -20.9358499, 29.0064175, 'Power substation', ARRAY['gwanda', 'substation', 'power', 'electricity'], true),

-- Natural features
('Thuli River', 'River', -21.0800362, 28.8367023, 'River near Gwanda', ARRAY['thuli', 'river', 'water'], true),
('Mtshabezi River', 'River', -20.9551563, 28.9224872, 'River near Gwanda', ARRAY['mtshabezi', 'river', 'water'], true),
('Mtshabezi Bridge', 'Bridge', -20.9481289, 28.9937889, 'Bridge over Mtshabezi River', ARRAY['mtshabezi', 'bridge', 'river'], true),
('Lower Mudjeni Dam', 'Water', -20.8443691, 28.9452795, 'Dam near Gwanda', ARRAY['mudjeni', 'dam', 'water', 'reservoir'], true),

-- Solar farms
('Blanket Mine Solar Farm', 'Industrial', -20.8552413, 28.9130286, 'Solar farm at Blanket Mine', ARRAY['blanket', 'mine', 'solar', 'farm', 'energy'], true),
('Sunset Tech Solar Farm', 'Industrial', -21.0068814, 29.1032433, 'Solar farm', ARRAY['sunset', 'tech', 'solar', 'farm', 'energy'], true),

-- Business centers
('Rural Business Centre', 'Business', -20.8165838, 28.8972484, 'Rural business center', ARRAY['rural', 'business', 'centre', 'center'], true),
('Rural Business Centre', 'Business', -20.7983989, 29.0608889, 'Rural business center', ARRAY['rural', 'business', 'centre', 'center'], true),

-- Other landmarks
('ACS', 'Building', -20.8522388, 28.8996585, 'ACS building', ARRAY['acs', 'building'], true),
('Slimes Dam', 'Industrial', -20.8439343, 28.909251, 'Mining dam', ARRAY['slimes', 'dam', 'mining', 'industrial'], true),
('Slimes Dam', 'Industrial', -20.8830195, 28.9209095, 'Mining dam', ARRAY['slimes', 'dam', 'mining', 'industrial'], true),
('Slimes Dam', 'Industrial', -20.8827147, 28.9257035, 'Mining dam', ARRAY['slimes', 'dam', 'mining', 'industrial'], true);

-- Add comment
COMMENT ON TABLE public.koloi_landmarks IS 'Stores landmarks and public places for Gwanda area to support location selection where street names are missing';