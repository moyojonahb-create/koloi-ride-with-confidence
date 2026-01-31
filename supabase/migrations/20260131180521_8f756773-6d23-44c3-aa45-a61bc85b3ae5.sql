-- Fix Spitzkop North (Red Cross) coordinates - should be closer to Gwanda CBD
-- Current: -20.83, 28.99 (too far north/west)
-- Corrected: approximately -20.925, 29.01 (in Gwanda town area)

UPDATE public.koloi_landmarks 
SET latitude = -20.925, longitude = 29.012, description = 'Spitzkop North area near Red Cross office'
WHERE name = 'Spitzkop North (Red Cross)';

-- Also fix Red Cross Gwanda if coordinates are off
UPDATE public.koloi_landmarks 
SET latitude = -20.933, longitude = 29.013, description = 'Zimbabwe Red Cross Society Gwanda branch'
WHERE name = 'Red Cross Gwanda';

-- Fix base Spitzkop location  
UPDATE public.koloi_landmarks 
SET latitude = -20.93, longitude = 29.008
WHERE name = 'Spitzkop' AND category = 'Village';