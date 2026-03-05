import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Fallback values for Supabase (public anon key - safe to include)
const FALLBACK_SUPABASE_URL = 'https://jidfganntquilvsytslp.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZGZnYW5udHF1aWx2c3l0c2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDM5MDIsImV4cCI6MjA4NDkxOTkwMn0.clwzOYffNy78E9kN2UnXVSHlWfTm3cMbZu3WtwCT3UM';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    // Ensure these env vars are ALWAYS defined with fallbacks
    // This prevents the Supabase client from crashing during preview
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
    ),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_KEY
    ),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(
      process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD2Psg8nBZJsremwudQ1d7Jk39asQ_v-Cg'
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
