// OSM GeoJSON parser for places
// Extracts named features and categorizes them for koloi_landmarks

export interface OsmPlace {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  keywords: string[];
}

const getCategoryFromProperties = (props: Record<string, string>): string | null => {
  if (props.amenity) {
    const amenityMap: Record<string, string> = {
      school: 'School', hospital: 'Hospital', clinic: 'Clinic', pharmacy: 'Pharmacy',
      bank: 'Bank', atm: 'Bank', fuel: 'Fuel Station', police: 'Police',
      post_office: 'Post Office', restaurant: 'Restaurant', fast_food: 'Restaurant',
      cafe: 'Restaurant', bar: 'Bar', pub: 'Bar', place_of_worship: 'Church',
      courthouse: 'Government', townhall: 'Government', community_centre: 'Community',
      library: 'Library', bus_station: 'Transport', taxi: 'Transport',
    };
    return amenityMap[props.amenity] || 'Amenity';
  }

  if (props.shop) {
    const shopMap: Record<string, string> = {
      supermarket: 'Supermarket', mall: 'Shopping', convenience: 'Shop',
      butcher: 'Shop', clothes: 'Shop', hardware: 'Hardware', furniture: 'Furniture',
      car_repair: 'Auto Services', agrarian: 'Agricultural', jewelry: 'Shop',
    };
    return shopMap[props.shop] || 'Shop';
  }

  if (props.tourism) {
    const tourismMap: Record<string, string> = {
      hotel: 'Hotel', guest_house: 'Hotel', motel: 'Hotel', hostel: 'Hotel',
      camp_site: 'Camping',
    };
    return tourismMap[props.tourism] || 'Tourism';
  }

  if (props.office) {
    if (props.office === 'government' || props.government) return 'Government';
    if (props.office === 'educational_institution') return 'Education';
    return 'Office';
  }

  if (props.healthcare || props.medical) return 'Healthcare';
  if (props.leisure === 'park') return 'Park';
  if (props.leisure === 'fitness_centre') return 'Fitness';
  if (props.leisure === 'sports_centre' || props.sport) return 'Sports';
  if (props.landuse === 'commercial') return 'Commercial';
  if (props.landuse === 'industrial' || props.man_made === 'works') return 'Industrial';
  if (props.highway && ['bus_stop', 'taxi'].includes(props.highway)) return 'Transport';
  if (props.craft) return 'Services';
  if (props.waterway) return 'Natural';

  if (props.route || props.boundary || props.highway || (props.building === 'yes' && !props.name)) {
    return null;
  }

  return null;
};

const extractKeywords = (name: string, props: Record<string, string>): string[] => {
  const keywords: string[] = [];
  const nameParts = name.toLowerCase().split(/[\s,\-&]+/).filter(p => p.length > 2);
  keywords.push(...nameParts);

  if (props.amenity) keywords.push(props.amenity);
  if (props.shop) keywords.push(props.shop);
  if (props.tourism) keywords.push(props.tourism);
  if (props.religion) keywords.push(props.religion);
  if (props.product) keywords.push(props.product);
  if (props.operator) keywords.push(...props.operator.toLowerCase().split(/\s+/));

  return [...new Set(keywords)].slice(0, 10);
};

interface GeoJsonFeature {
  properties: Record<string, string>;
  geometry?: { coordinates?: number[] };
}

interface GeoJson {
  features?: GeoJsonFeature[];
}

export const parseOsmGeoJson = (geojson: unknown): OsmPlace[] => {
  const places: OsmPlace[] = [];
  const seenNames = new Set<string>();
  const gj = geojson as GeoJson;

  for (const feature of gj.features || []) {
    const props = feature.properties || {};
    const name = props.name;

    if (!name || typeof name !== 'string' || name.length < 2) continue;
    
    const normalizedName = name.toLowerCase().trim();
    if (seenNames.has(normalizedName)) continue;

    const category = getCategoryFromProperties(props);
    if (!category) continue;

    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    const [longitude, latitude] = coords;
    
    const isGwanda = latitude >= -21.5 && latitude <= -20.5 && longitude >= 28.5 && longitude <= 29.5;
    const isBeitbridge = latitude >= -22.35 && latitude <= -22.05 && longitude >= 29.85 && longitude <= 30.15;
    if (!isGwanda && !isBeitbridge) continue;

    seenNames.add(normalizedName);
    
    places.push({
      id: props['@id'] || `osm-${Date.now()}-${places.length}`,
      name: name.trim(),
      category,
      latitude,
      longitude,
      keywords: extractKeywords(name, props),
    });
  }

  return places;
};

export const generateSeedSql = (places: OsmPlace[]): string => {
  const values = places.map(p => {
    const escapedName = p.name.replace(/'/g, "''");
    const escapedKeywords = p.keywords.map(k => k.replace(/'/g, "''"));
    return `('${escapedName}', '${p.category}', ${p.latitude}, ${p.longitude}, ARRAY[${escapedKeywords.map(k => `'${k}'`).join(', ')}], true)`;
  });

  return `
DELETE FROM koloi_landmarks WHERE id IS NOT NULL;

INSERT INTO koloi_landmarks (name, category, latitude, longitude, keywords, is_active)
VALUES
${values.join(',\n')};
  `.trim();
};
