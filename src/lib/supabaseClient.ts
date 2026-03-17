// Re-export from the auto-generated Supabase client to avoid duplicate instances
export { supabase } from '@/integrations/supabase/client';

// Export URL and key for edge function calls etc.
// Do NOT keep secrets or production keys in source. Read from env and fail-safe to null.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || null;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || null;

// Throw early with clear error messages if environment variables are missing
if (!SUPABASE_URL) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_URL');
}
if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_PUBLISHABLE_KEY');
}

export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
