import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Note: This endpoint is intentionally public because:
    // 1. Mapbox tokens are designed to be public (pk. prefix)
    // 2. Security is enforced via domain restrictions in Mapbox dashboard
    // 3. The homepage map needs to be visible to unauthenticated users

    const mapboxToken = Deno.env.get("VITE_MAPBOX_TOKEN");
    
    if (!mapboxToken) {
      console.error("VITE_MAPBOX_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Mapbox token not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({ token: mapboxToken }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in get-mapbox-token:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
