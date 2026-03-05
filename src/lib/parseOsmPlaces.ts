// OSM GeoJSON parser for Gwanda places
// Extracts named features and categorizes them for koloi_landmarks

export interface OsmPlace {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  keywords: string[];
}

// Map OSM tags to our categories
const getCategoryFromProperties = (props: Record<string, unknown>): string | null => {
  // Priority order for category detection
  if (props.amenity) {
    const amenityMap: Record<string, string> = {
      school: 'School',
      hospital: 'Hospital',
      clinic: 'Clinic',
      pharmacy: 'Pharmacy',
      bank: 'Bank',
      atm: 'Bank',
      fuel: 'Fuel Station',
      police: 'Police',
      post_office: 'Post Office',
      restaurant: 'Restaurant',
      fast_food: 'Restaurant',
      cafe: 'Restaurant',
      bar: 'Bar',
      pub: 'Bar',
      place_of_worship: 'Church',
      courthouse: 'Government',
      townhall: 'Government',
      community_centre: 'Community',
      library: 'Library',
      bus_station: 'Transport',
      taxi: 'Transport',
    };
    return amenityMap[props.amenity] || 'Amenity';
  }

  if (props.shop) {
    const shopMap: Record<string, string> = {
      supermarket: 'Supermarket',
      mall: 'Shopping',
      convenience: 'Shop',
      butcher: 'Shop',
      clothes: 'Shop',
      hardware: 'Hardware',
      furniture: 'Furniture',
      car_repair: 'Auto Services',
      agrarian: 'Agricultural',
      jewelry: 'Shop',
    };
    return shopMap[props.shop] || 'Shop';
  }

  if (props.tourism) {
    const tourismMap: Record<string, string> = {
      hotel: 'Hotel',
      guest_house: 'Hotel',
      motel: 'Hotel',
      hostel: 'Hotel',
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

  // Skip routes, boundaries, and non-POI features
  if (props.route || props.boundary || props.highway || props.building === 'yes' && !props.name) {
    return null;
  }

  return null;
};

// Extract keywords from the place name and properties
const extractKeywords = (name: string, props: Record<string, unknown>): string[] => {
  const keywords: string[] = [];
  
  // Add name parts as keywords
  const nameParts = name.toLowerCase().split(/[\s,\-&]+/).filter(p => p.length > 2);
  keywords.push(...nameParts);

  // Add category-specific keywords
  if (props.amenity) keywords.push(props.amenity);
  if (props.shop) keywords.push(props.shop);
  if (props.tourism) keywords.push(props.tourism);
  if (props.religion) keywords.push(props.religion);
  if (props.product) keywords.push(props.product);
  if (props.operator) keywords.push(...props.operator.toLowerCase().split(/\s+/));

  return [...new Set(keywords)].slice(0, 10);
};

export const parseOsmGeoJson = (geojson: unknown): OsmPlace[] => {
  const places: OsmPlace[] = [];
  const seenNames = new Set<string>();

  for (const feature of geojson.features || []) {
    const props = feature.properties || {};
    const name = props.name;

    // Skip features without names or with duplicate names
    if (!name || typeof name !== 'string' || name.length < 2) continue;
    
    // Normalize name for deduplication
    const normalizedName = name.toLowerCase().trim();
    if (seenNames.has(normalizedName)) continue;

    // Get category
    const category = getCategoryFromProperties(props);
    if (!category) continue;

    // Extract coordinates
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    const [longitude, latitude] = coords;
    
    // Validate coordinates are within supported towns
    const isGwanda = latitude >= -21.5 && latitude <= -20.5 && longitude >= 28.5 && longitude <= 29.5;
    const isBeitbridge = latitude >= -22.35 && latitude <= -22.05 && longitude >= 29.85 && longitude <= 30.15;
    if (!isGwanda && !isBeitbridge) {
      continue;
    }

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

// Generate SQL insert statements for the landmarks
export const generateSeedSql = (places: OsmPlace[]): string => {
  const values = places.map(p => {
    const escapedName = p.name.replace(/'/g, "''");
    const escapedKeywords = p.keywords.map(k => k.replace(/'/g, "''"));
    return `('${escapedName}', '${p.category}', ${p.latitude}, ${p.longitude}, ARRAY[${escapedKeywords.map(k => `'${k}'`).join(', ')}], true)`;
  });

  return `
-- Clear existing landmarks and insert new ones from OSM
DELETE FROM koloi_landmarks WHERE id IS NOT NULL;

INSERT INTO koloi_landmarks (name, category, latitude, longitude, keywords, is_active)
VALUES
${values.join(',\n')};
  `.trim();
};
