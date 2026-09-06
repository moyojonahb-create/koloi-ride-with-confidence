/**
 * Runtime config for the mobile app, injected into `@cruixe/core`.
 *
 * The web app reads `import.meta.env.VITE_*` inside its clients; Metro/Hermes
 * has no `import.meta.env` at all. `defineCoreConfig()` is the seam that lets
 * both supply their own values without the client code knowing which.
 *
 * `process.env.EXPO_PUBLIC_*` is inlined into the bundle at build time by
 * Metro's Expo preset — these are not read from the device environment, and
 * only publishable values belong here (see `.env.example`).
 *
 * **Why this does not throw at module load.** `defineCoreConfig()` throws on
 * missing keys, which is correct, but a throw during module evaluation on
 * React Native takes the whole app down to a red screen in dev and a bare
 * crash in production — before any UI exists to explain what is wrong. Core's
 * own comment anticipates this: it throws "and lets each platform render its
 * own failure state". So the throw is captured here and surfaced as a value
 * the UI can render.
 */

import { defineCoreConfig, type CoreConfig } from '@cruixe/core';

export type CoreConfigResult =
  | { ok: true; config: Readonly<CoreConfig> }
  | { ok: false; error: Error };

function loadConfig(): CoreConfigResult {
  try {
    return {
      ok: true,
      config: defineCoreConfig({
        apiBaseUrl: process.env.EXPO_PUBLIC_GO_BACKEND_URL ?? '',
        wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? '',
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
        supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
        // Distinct from the web app's legacy `pickme-web`, so backend logs and
        // Supabase analytics can tell the two clients apart.
        clientInfo: 'cruixe-mobile',
      }),
    };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

export const coreConfigResult: CoreConfigResult = loadConfig();
