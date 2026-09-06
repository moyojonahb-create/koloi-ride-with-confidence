/**
 * Zimbabwe place search via Nominatim — PORT of `src/lib/geo_osm.ts`.
 *
 * **The dev branch is removed, not ported.** Web picks its URL from
 * `import.meta.env.DEV`: in dev it hits `/api/nominatim/search` on
 * `window.location.origin`, which is a Vite proxy path built from a DOM global —
 * two things that cannot exist on a device. Production already routes through
 * the Supabase Edge Function `nominatim-search`, which exists to add CORS
 * headers and a proper User-Agent, and that is the only branch a device can
 * use. So mobile always takes the Edge Function path.
 *
 * This is the same treatment `config.ts` documents for the other ported
 * clients — dev-only branches that cannot mean anything on device are dropped
 * rather than forked per platform — so it is not a DIVERGENCE entry.
 *
 * Caching of results into `places_cache` is deliberately NOT done here. Web's
 * `searchAndCache()` couples a read to a write through the Supabase singleton;
 * keeping the fetch pure lets the caller decide, and keeps this module testable
 * with nothing but a fake `fetch`.
 */

import type { CoreConfig } from '../config';

export interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  class?: string;
  type?: string;
  address?: Record<string, string>;
}

export interface Viewbox {
  /** min longitude */ left: number;
  /** max latitude  */ top: number;
  /** max longitude */ right: number;
  /** min latitude  */ bottom: number;
}

/** Matches the web client's timeout so slow-link behaviour is identical. */
export const NOMINATIM_TIMEOUT_MS = 5000;

type NominatimConfig = Pick<CoreConfig, 'supabaseUrl' | 'supabasePublishableKey'>;

/**
 * Builds the Edge Function URL. Exported so the query-shape can be asserted in
 * a test without a network call — the parameters are load-bearing
 * (`countrycodes=zw` in particular) and a silent change would widen results to
 * the whole planet.
 */
export function buildSearchUrl(
  config: NominatimConfig,
  q: string,
  limit = 10,
  viewbox?: Viewbox,
  bounded = false,
): string {
  const url = new URL(`${config.supabaseUrl}/functions/v1/nominatim-search`);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('countrycodes', 'zw');
  if (viewbox) {
    url.searchParams.set(
      'viewbox',
      `${viewbox.left},${viewbox.top},${viewbox.right},${viewbox.bottom}`,
    );
    if (bounded) url.searchParams.set('bounded', '1');
  }
  return url.toString();
}

export function buildReverseUrl(config: NominatimConfig, lat: number, lon: number): string {
  const url = new URL(`${config.supabaseUrl}/functions/v1/nominatim-reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  return url.toString();
}

function headers(config: NominatimConfig): Record<string, string> {
  return {
    Accept: 'application/json',
    apikey: config.supabasePublishableKey,
    Authorization: `Bearer ${config.supabasePublishableKey}`,
  };
}

/**
 * Runs a request with both a timeout and the caller's optional signal.
 *
 * An abort resolves to the fallback rather than throwing — matching web, where
 * a timed-out suggestion lookup must not surface as an error while the user is
 * still typing. A genuine failure still throws.
 */
async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  onAbort: () => T,
  signal: AbortSignal | undefined,
  fetchTimeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    return await run(controller.signal);
  } catch (err) {
    if (controller.signal.aborted) return onAbort();
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface NominatimDeps {
  config: NominatimConfig;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function createNominatimClient(deps: NominatimDeps) {
  const doFetch = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? NOMINATIM_TIMEOUT_MS;

  return {
    /** Forward geocode across Zimbabwe. Returns [] on timeout/abort. */
    async search(
      q: string,
      limit = 10,
      viewbox?: Viewbox,
      bounded = false,
      signal?: AbortSignal,
    ): Promise<NominatimResult[]> {
      const url = buildSearchUrl(deps.config, q, limit, viewbox, bounded);
      return withTimeout(
        async (s) => {
          const res = await doFetch(url, { headers: headers(deps.config), signal: s });
          if (!res.ok) throw new Error('Place search failed');
          return (await res.json()) as NominatimResult[];
        },
        () => [],
        signal,
        timeoutMs,
      );
    },

    /** Reverse geocode. Returns null on timeout/abort rather than throwing. */
    async reverse(lat: number, lon: number, signal?: AbortSignal): Promise<NominatimResult | null> {
      const url = buildReverseUrl(deps.config, lat, lon);
      return withTimeout(
        async (s) => {
          const res = await doFetch(url, { headers: headers(deps.config), signal: s });
          if (!res.ok) throw new Error('Reverse geocode failed');
          return (await res.json()) as NominatimResult;
        },
        () => null,
        signal,
        timeoutMs,
      );
    },
  };
}

export type NominatimClient = ReturnType<typeof createNominatimClient>;
