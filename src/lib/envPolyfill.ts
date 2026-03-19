// Keep this file as a safe side-effect import entry point.
// Do not mutate import.meta.env at runtime: it can break HMR/runtime consistency.
if (typeof import.meta.env !== 'undefined') {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    console.warn('[Voyex] Missing VITE_SUPABASE_* env vars. Falling back to Vite define-time defaults.');
  }
}

export {};
