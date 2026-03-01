import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

let cachedKey: string | null = null;

export function useGoogleMapsKey() {
  const [apiKey, setApiKey] = useState<string | null>(cachedKey);
  const [loading, setLoading] = useState(!cachedKey);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedKey) {
      setApiKey(cachedKey);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "google-maps-key"
        );
        if (cancelled) return;
        if (invokeError || !data?.apiKey) {
          setError(invokeError?.message ?? "Failed to load Maps API key");
          return;
        }
        cachedKey = data.apiKey;
        setApiKey(data.apiKey);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { apiKey, loading, error };
}
