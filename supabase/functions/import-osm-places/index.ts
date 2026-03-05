import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map OSM tags to our categories
const getCategoryFromProperties = (props: Record<string, unknown>): string | null => {
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

  // Education tag without amenity
  if (props.education === 'yes') return 'School';
  
  if (props.healthcare || props.medical) return 'Healthcare';
  if (props.leisure === 'park') return 'Park';
  if (props.leisure === 'fitness_centre') return 'Fitness';
  if (props.leisure === 'sports_centre' || props.sport) return 'Sports';
  if (props.landuse === 'commercial') return 'Commercial';
  if (props.landuse === 'industrial' || props.man_made === 'works') return 'Industrial';
  if (props.highway && ['bus_stop', 'taxi'].includes(props.highway)) return 'Transport';
  if (props.craft) return 'Services';
  
  // Named buildings with name but no other tags - include as Landmark
  if (props.building && props.name) return 'Landmark';
  
  // Named places without specific tags
  if (props.place) return 'Area';

  // Skip routes, boundaries, and non-POI features
  if (props.route || props.boundary || props.highway || (props.building === 'yes' && !props.name)) {
    return null;
  }

  return null;
};

// Extract keywords from the place name and properties
const extractKeywords = (name: string, props: Record<string, unknown>): string[] => {
  const keywords: string[] = [];
  
  const nameParts = name.toLowerCase().split(/[\s,\-&]+/).filter(p => p.length > 2);
  keywords.push(...nameParts);

  if (typeof props.amenity === 'string') keywords.push(props.amenity);
  if (typeof props.shop === 'string') keywords.push(props.shop);
  if (typeof props.tourism === 'string') keywords.push(props.tourism);
  if (typeof props.religion === 'string') keywords.push(props.religion);
  if (typeof props.product === 'string') keywords.push(props.product);
  if (typeof props.operator === 'string') keywords.push(...props.operator.toLowerCase().split(/\s+/));

  return [...new Set(keywords)].slice(0, 10);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Authentication & Admin check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { geojson, mode = 'replace' } = await req.json();

    if (!geojson || !geojson.features) {
      return new Response(JSON.stringify({ error: "Invalid GeoJSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const places: unknown[] = [];
    const seenNames = new Set<string>();

    for (const feature of geojson.features) {
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
      
      // Validate coordinates for supported towns
      // Gwanda area: lat -21.5 to -20.5, lng 28.5 to 29.5
      // Beitbridge area: lat -22.35 to -22.05, lng 29.85 to 30.15
      const isGwanda = latitude >= -21.5 && latitude <= -20.5 && longitude >= 28.5 && longitude <= 29.5;
      const isBeitbridge = latitude >= -22.35 && latitude <= -22.05 && longitude >= 29.85 && longitude <= 30.15;
      if (!isGwanda && !isBeitbridge) {
        continue;
      }

      seenNames.add(normalizedName);
      
      places.push({
        name: name.trim(),
        category,
        latitude,
        longitude,
        keywords: extractKeywords(name, props),
        is_active: true,
      });
    }

    console.log(`Parsed ${places.length} places from GeoJSON`);

    // Only clear existing landmarks in replace mode
    if (mode === 'replace') {
      const { error: deleteError } = await supabase
        .from('koloi_landmarks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error("Delete error:", deleteError);
      }
    }

    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < places.length; i += batchSize) {
      const batch = places.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('koloi_landmarks')
        .insert(batch);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: inserted,
        message: `Successfully imported ${inserted} places from OSM` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Import error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
