// Environment variable polyfill - ensures Supabase env vars are always available
// This must be imported BEFORE any Supabase client usage

const FALLBACK_SUPABASE_URL = 'https://jidfganntquilvsytslp.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZGZnYW5udHF1aWx2c3l0c2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDM5MDIsImV4cCI6MjA4NDkxOTkwMn0.clwzOYffNy78E9kN2UnXVSHlWfTm3cMbZu3WtwCT3UM';

// Polyfill import.meta.env if values are missing
if (typeof import.meta.env !== 'undefined') {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    (import.meta.env as unknown).VITE_SUPABASE_URL = FALLBACK_SUPABASE_URL;
  }
  if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    (import.meta.env as unknown).VITE_SUPABASE_PUBLISHABLE_KEY = FALLBACK_SUPABASE_KEY;
  }
}

export {};
