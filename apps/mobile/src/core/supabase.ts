/**
 * The mobile Supabase client.
 *
 * Everything platform-neutral — realtime tuning, header shape, session
 * persistence flags — comes from `buildSupabaseOptions()` in `@cruixe/core`.
 * The only mobile-specific input is the storage adapter.
 *
 * **Why the web client could not simply be imported.** It hardcodes
 * `brokeredPreviewStorage()`, which brokers the session to the Lovable editor
 * over `window.parent.postMessage` and falls back to `localStorage` — three DOM
 * globals in one adapter. It is a Lovable preview artifact with no meaning on a
 * device, and is deliberately not referenced here.
 *
 * `detectSessionInUrl` is driven to `false` by `platform: 'native'`: supabase-js
 * would otherwise try to parse a session out of a URL fragment at startup,
 * which is a web OAuth-redirect concept a device has no equivalent for.
 */

// Must precede the supabase-js import: supabase-js constructs `URL` and
// `URLSearchParams` during client creation, and Hermes' built-ins are not
// complete enough to rely on across both platforms.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildSupabaseOptions, type StorageAdapter } from '@cruixe/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { coreConfigResult } from './config';

/**
 * AsyncStorage already satisfies core's `StorageAdapter` contract — this alias
 * exists to make that claim checkable at compile time rather than assumed.
 */
const storage: StorageAdapter = AsyncStorage;

/**
 * Null when config is invalid. The UI renders the failure from
 * `coreConfigResult` rather than this being a throw at module load; see the
 * comment in `config.ts` for why a throw here would be unrecoverable.
 */
export const supabase: SupabaseClient | null = coreConfigResult.ok
  ? createClient(
      coreConfigResult.config.supabaseUrl,
      coreConfigResult.config.supabasePublishableKey,
      buildSupabaseOptions(coreConfigResult.config, { storage, platform: 'native' }),
    )
  : null;

/**
 * Narrowing helper for call sites that cannot proceed without a client.
 * Everything reachable in the app is behind the config-failure screen, so this
 * only fires on a programming error, not on a misconfigured build.
 */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase client unavailable — CruiXe core is misconfigured. This should have been caught by the config gate.',
    );
  }
  return supabase;
}
