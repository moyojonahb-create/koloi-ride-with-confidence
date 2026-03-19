// Re-export from the auto-generated Supabase client to avoid duplicate instances
export { supabase } from '@/integrations/supabase/client';

// Export URL and key for edge function calls etc.
// Never crash app startup because of missing env at import-time.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn('[Voyex] Supabase env missing. Falling back to client defaults. Check VITE_SUPABASE_* env vars.');
}

export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
