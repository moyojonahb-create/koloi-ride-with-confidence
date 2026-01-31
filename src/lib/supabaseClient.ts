// Safe wrapper for Supabase client that ensures env vars are available
// This provides fallback values in case import.meta.env fails during development
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Primary: try to read from Vite's import.meta.env
// Fallback: use known project values (these are public/anon keys, safe to include)
const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://jidfganntquilvsytslp.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZGZnYW5udHF1aWx2c3l0c2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDM5MDIsImV4cCI6MjA4NDkxOTkwMn0.clwzOYffNy78E9kN2UnXVSHlWfTm3cMbZu3WtwCT3UM';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
