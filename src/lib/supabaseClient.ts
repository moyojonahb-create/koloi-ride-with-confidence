// Re-export from the auto-generated Supabase client to avoid duplicate instances
export { supabase } from '@/integrations/supabase/client';

// Export URL and key for edge function calls etc.
const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://jidfganntquilvsytslp.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZGZnYW5udHF1aWx2c3l0c2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDM5MDIsImV4cCI6MjA4NDkxOTkwMn0.clwzOYffNy78E9kN2UnXVSHlWfTm3cMbZu3WtwCT3UM';

export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
