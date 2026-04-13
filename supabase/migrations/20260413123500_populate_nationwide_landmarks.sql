-- Nationwide Zimbabwe landmarks population
-- This migration populates koloi_landmarks for all major cities and towns in Zimbabwe

INSERT INTO public.koloi_landmarks (name, category, latitude, longitude, description, keywords, is_active) VALUES
-- HARARE (Capital)
('Harare CBD', 'City', -17.8292, 31.0522, 'Capital of Zimbabwe', ARRAY['harare', 'cbd', 'city', 'capital'], true),
('Fourth St Bus Terminus', 'Rank', -17.8310, 31.0480, 'Major intercity bus rank', ARRAY['fourth', 'street', 'rank', 'bus', 'terminus'], true),
('Market Square', 'Rank', -17.8335, 31.0425, 'Major bus rank and market', ARRAY['market', 'square', 'rank', 'bus'], true),
('Copa Cabana', 'Rank', -17.8305, 31.0455, 'Major local bus rank', ARRAY['copa', 'cabana', 'rank', 'bus'], true),
('Mbare Musika', 'Market', -17.8590, 31.0390, 'Largest traditional market and bus terminus', ARRAY['mbare', 'musika', 'market', 'rank', 'bus'], true),
('Parirenyatwa Hospital', 'Hospital', -17.8190, 31.0440, 'Major referral hospital', ARRAY['parirenyatwa', 'hospital', 'medical'], true),
('Harare Central Hospital', 'Hospital', -17.8570, 31.0320, 'Major government hospital', ARRAY['st', 'annes', 'harare', 'central', 'hospital'], true),
('Sam Levy Village', 'Shopping', -17.7870, 31.0450, 'Major shopping mall in Borrowdale', ARRAY['sam', 'levy', 'village', 'shopping', 'mall', 'borrowdale'], true),
('Eastgate Mall', 'Shopping', -17.8315, 31.0495, 'Iconic shopping mall in CBD', ARRAY['eastgate', 'mall', 'shopping'], true),
('Joina City', 'Shopping', -17.8300, 31.0465, 'High-rise shopping and office complex', ARRAY['joina', 'city', 'shopping', 'mall'], true),
('University of Zimbabwe', 'University', -17.7830, 31.0530, 'Main university campus', ARRAY['uz', 'university', 'zimbabwe', 'education'], true),

-- BULAWAYO
('Bulawayo CBD', 'City', -20.1500, 28.5800, 'Second largest city', ARRAY['bulawayo', 'byo', 'cbd', 'city'], true),
('Renkini Bus Terminus', 'Rank', -20.1530, 28.5750, 'Major intercity bus rank', ARRAY['renkini', 'rank', 'bus', 'terminus'], true),
('City Hall Rank', 'Rank', -20.1510, 28.5820, 'Local bus and taxi rank', ARRAY['city', 'hall', 'rank', 'taxi'], true),
('Egodini', 'Rank', -20.1545, 28.5790, 'Basement bus terminus', ARRAY['egodini', 'rank', 'bus', 'taxi'], true),
('Mpilo Central Hospital', 'Hospital', -20.1320, 28.5650, 'Major referral hospital', ARRAY['mpilo', 'hospital', 'medical'], true),
('United Bulawayo Hospitals (UBH)', 'Hospital', -20.1620, 28.5950, 'Major government hospital', ARRAY['ubh', 'hospital', 'medical'], true),
('Bulawayo Centre', 'Shopping', -20.1490, 28.5810, 'Major shopping mall', ARRAY['bulawayo', 'centre', 'shopping', 'mall'], true),
('Ascot Shopping Centre', 'Shopping', -20.1600, 28.6050, 'Shopping mall', ARRAY['ascot', 'shopping', 'mall'], true),
('National University of Science and Technology', 'University', -20.1750, 28.6250, 'NUST campus', ARRAY['nust', 'university', 'education'], true),

-- BEITBRIDGE
('Beitbridge Border Post', 'Border', -22.2280, 29.9860, 'Major border crossing to SA', ARRAY['border', 'beitbridge', 'crossing', 'customs'], true),
('Beitbridge Rank', 'Rank', -22.2170, 29.9900, 'Major bus rank near border', ARRAY['rank', 'bus', 'beitbridge'], true),
('Dulivhadzimu Stadium', 'Leisure', -22.2140, 29.9850, 'Main stadium in Beitbridge', ARRAY['dulivhadzimu', 'stadium', 'football'], true),
('ZRP Beitbridge', 'Police', -22.2180, 29.9880, 'Main police station', ARRAY['police', 'zrp', 'beitbridge'], true),

-- MASVINGO
('Masvingo CBD', 'Town', -20.0744, 30.8328, 'Ancient city gateway', ARRAY['masvingo', 'cbd', 'town'], true),
('Mucheke Rank', 'Rank', -20.0880, 30.8150, 'Main bus rank in Masvingo', ARRAY['mucheke', 'rank', 'bus', 'terminus'], true),
('Great Zimbabwe Monuments', 'Landmark', -20.2680, 30.9330, 'UNESCO World Heritage site', ARRAY['great', 'zimbabwe', 'ruins', 'monuments'], true),
('Masvingo General Hospital', 'Hospital', -20.0700, 30.8280, 'Main hospital', ARRAY['masvingo', 'hospital', 'medical'], true),

-- MUTARE
('Mutare CBD', 'City', -18.9707, 32.6709, 'Eastern gateway city', ARRAY['mutare', 'cbd', 'city'], true),
('Sakubva Musika', 'Rank', -18.9750, 32.6450, 'Main market and bus rank', ARRAY['sakubva', 'musika', 'rank', 'market'], true),
('Mutare General Hospital', 'Hospital', -18.9680, 32.6650, 'Main hospital', ARRAY['mutare', 'hospital', 'medical'], true),
('Christmas Pass', 'Landmark', -18.9500, 32.6400, 'Scenic mountain pass entrance', ARRAY['christmas', 'pass', 'view'], true),

-- GWERU
('Gweru CBD', 'City', -19.4500, 29.8167, 'Midlands capital', ARRAY['gweru', 'cbd', 'city'], true),
('Kudzanayi Bus Terminus', 'Rank', -19.4520, 29.8150, 'Major central bus rank', ARRAY['kudzanayi', 'rank', 'bus', 'terminus'], true),
('Midlands State University', 'University', -19.4850, 29.8450, 'MSU Main Campus', ARRAY['msu', 'university', 'gweru', 'education'], true),
('Gweru General Hospital', 'Hospital', -19.4470, 29.8120, 'Main hospital', ARRAY['gweru', 'hospital', 'medical'], true),

-- VICTORIA FALLS
('Victoria Falls Town', 'Town', -17.9318, 25.8325, 'Tourist capital', ARRAY['vic', 'falls', 'town', 'tourist'], true),
('The Victoria Falls', 'Landmark', -17.9243, 25.8572, 'Mosi-oa-Tunya waterfall', ARRAY['falls', 'waterfall', 'victoria', 'landmark'], true),
('Vic Falls Rank', 'Rank', -17.9320, 25.8300, 'Main bus rank', ARRAY['rank', 'bus', 'falls'], true),
('Victoria Falls Bridge', 'Landmark', -17.9280, 25.8620, 'Border bridge to Zambia', ARRAY['bridge', 'border', 'falls'], true),

-- KWEKWE
('Kwekwe CBD', 'Town', -18.9281, 29.8142, 'Mining city', ARRAY['kwekwe', 'cbd', 'town'], true),
('Kwekwe Rank', 'Rank', -18.9290, 29.8140, 'Main bus rank', ARRAY['rank', 'bus', 'kwekwe'], true),
('Kwekwe General Hospital', 'Hospital', -18.9250, 29.8100, 'Main hospital', ARRAY['kwekwe', 'hospital', 'medical'], true),

-- KADOMA
('Kadoma CBD', 'Town', -18.3333, 29.9167, 'Mining town', ARRAY['kadoma', 'cbd', 'town'], true),
('Kadoma Rank', 'Rank', -18.3340, 29.9160, 'Main bus rank', ARRAY['rank', 'bus', 'kadoma'], true),
('Kadoma General Hospital', 'Hospital', -18.3300, 29.9130, 'Main hospital', ARRAY['kadoma', 'hospital', 'medical'], true),

-- CHINHOYI
('Chinhoyi CBD', 'Town', -17.3500, 30.2000, 'Mash West capital', ARRAY['chinhoyi', 'cbd', 'town'], true),
('Chinhoyi Caves', 'Landmark', -17.3550, 30.1300, 'Famous dolomite caves', ARRAY['chinhoyi', 'caves', 'landmark', 'tourist'], true),
('Chinhoyi Rank', 'Rank', -17.3500, 30.2000, 'Main bus rank', ARRAY['rank', 'bus', 'chinhoyi'], true),

-- HWANGE
('Hwange Town', 'Town', -18.3647, 26.5000, 'Coal mining town', ARRAY['hwange', 'town', 'mining'], true),
('Hwange Rank', 'Rank', -18.3650, 26.5000, 'Main bus rank', ARRAY['rank', 'bus', 'hwange'], true),
('Hwange Colliery Hospital', 'Hospital', -18.3620, 26.4960, 'Main hospital', ARRAY['hwange', 'hospital', 'medical'], true),

-- MARONDERA
('Marondera CBD', 'Town', -18.1833, 31.5500, 'Mash East capital', ARRAY['marondera', 'cbd', 'town'], true),
('Marondera Rank', 'Rank', -18.1830, 31.5500, 'Main bus rank', ARRAY['rank', 'bus', 'marondera'], true),

-- BINDURA
('Bindura CBD', 'Town', -17.3000, 31.3333, 'Mash Central capital', ARRAY['bindura', 'cbd', 'town'], true),
('Bindura Rank', 'Rank', -17.3000, 31.3333, 'Main bus rank', ARRAY['rank', 'bus', 'bindura'], true),
('Bindura University', 'University', -17.3100, 31.3200, 'BUSE campus', ARRAY['bindura', 'university', 'education'], true),

-- PLUMTREE
('Plumtree CBD', 'Town', -20.4850, 27.8130, 'Border town', ARRAY['plumtree', 'cbd', 'town'], true),
('Plumtree Border Post', 'Border', -20.4900, 27.8100, 'Border to Botswana', ARRAY['border', 'plumtree', 'crossing'], true),
('Plumtree Rank', 'Rank', -20.4850, 27.8130, 'Main bus rank', ARRAY['rank', 'bus', 'plumtree'], true),

-- KARIBA
('Kariba Town', 'Town', -16.5167, 28.8000, 'Resort town', ARRAY['kariba', 'town', 'resort'], true),
('Kariba Dam Wall', 'Landmark', -16.5224, 28.7617, 'Iconic hydroelectric dam', ARRAY['kariba', 'dam', 'wall', 'landmark'], true),
('Nyamhunga Rank', 'Rank', -16.5200, 28.8200, 'Main bus rank', ARRAY['rank', 'bus', 'kariba', 'nyamhunga'], true),

-- ZVISHAVANE
('Zvishavane CBD', 'Town', -20.3280, 30.0320, 'Mining town', ARRAY['zvishavane', 'cbd', 'town'], true),
('Zvishavane Rank', 'Rank', -20.3280, 30.0320, 'Main bus rank', ARRAY['rank', 'bus', 'zvishavane'], true),

-- CHIREDZI
('Chiredzi CBD', 'Town', -21.0500, 31.6667, 'Sugarcane town', ARRAY['chiredzi', 'cbd', 'town'], true),
('Chiredzi Rank', 'Rank', -21.0500, 31.6667, 'Main bus rank', ARRAY['rank', 'bus', 'chiredzi'], true),

-- RUSAPE
('Rusape CBD', 'Town', -18.5333, 32.1167, 'Major transit town', ARRAY['rusape', 'cbd', 'town'], true),
('Rusape Rank', 'Rank', -18.5333, 32.1167, 'Main bus rank', ARRAY['rank', 'bus', 'rusape'], true),

-- CHIPINGE
('Chipinge CBD', 'Town', -20.2000, 32.6167, 'Agricultural town', ARRAY['chipinge', 'cbd', 'town'], true),
('Chipinge Rank', 'Rank', -20.2000, 32.6167, 'Main bus rank', ARRAY['rank', 'bus', 'chipinge'], true),

-- KAROI
('Karoi CBD', 'Town', -16.8167, 29.6833, 'Agricultural town', ARRAY['karoi', 'cbd', 'town'], true),
('Karoi Rank', 'Rank', -16.8167, 29.6833, 'Main bus rank', ARRAY['rank', 'bus', 'karoi'], true),

-- SHURUGWI
('Shurugwi CBD', 'Town', -19.6667, 30.0000, 'Mining town', ARRAY['shurugwi', 'cbd', 'town'], true),
('Shurugwi Rank', 'Rank', -19.6667, 30.0000, 'Main bus rank', ARRAY['rank', 'bus', 'shurugwi'], true),

-- NORTON
('Norton CBD', 'Town', -17.8833, 30.7000, 'Satellite town to Harare', ARRAY['norton', 'cbd', 'town'], true),
('Norton Rank', 'Rank', -17.8830, 30.7000, 'Main bus rank', ARRAY['rank', 'bus', 'norton'], true),

-- CHEGUTU
('Chegutu CBD', 'Town', -18.1333, 30.1333, 'Agricultural and mining town', ARRAY['chegutu', 'cbd', 'town'], true),
('Chegutu Rank', 'Rank', -18.1330, 30.1330, 'Main bus rank', ARRAY['rank', 'bus', 'chegutu'], true);

-- Add comment for confirmation
COMMENT ON TABLE public.koloi_landmarks IS 'Stores landmarks and public places for major Zimbabwean towns and cities to support nationwide location selection';
