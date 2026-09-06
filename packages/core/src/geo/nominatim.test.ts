import { describe, expect, it, vi } from 'vitest';

import { buildReverseUrl, buildSearchUrl, createNominatimClient } from './nominatim';

const config = {
  supabaseUrl: 'https://project.supabase.co',
  supabasePublishableKey: 'pk_test_123',
};

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

describe('nominatim URL shape', () => {
  it('routes through the Edge Function, never a Vite proxy path', () => {
    const url = buildSearchUrl(config, 'chicken inn');
    // The dev branch web uses (`/api/nominatim/search` on window.location.origin)
    // must not survive the port — there is no proxy and no origin on a device.
    expect(url).toContain('https://project.supabase.co/functions/v1/nominatim-search');
    expect(url).not.toContain('/api/nominatim');
  });

  it('always constrains results to Zimbabwe', () => {
    // Losing this widens every search to the whole planet, which looks like
    // bad ranking rather than a missing parameter.
    expect(buildSearchUrl(config, 'main street')).toContain('countrycodes=zw');
  });

  it('encodes the query rather than interpolating it raw', () => {
    const url = buildSearchUrl(config, 'a&b c');
    expect(url).toContain('q=a%26b+c');
  });

  it('emits viewbox only when supplied, and bounded only when asked', () => {
    const box = { left: 28.9, top: -20.9, right: 29.1, bottom: -21.1 };
    expect(buildSearchUrl(config, 'q')).not.toContain('viewbox');
    expect(buildSearchUrl(config, 'q', 10, box)).toContain('viewbox=28.9%2C-20.9%2C29.1%2C-21.1');
    expect(buildSearchUrl(config, 'q', 10, box)).not.toContain('bounded');
    expect(buildSearchUrl(config, 'q', 10, box, true)).toContain('bounded=1');
  });

  it('builds a reverse URL from coordinates', () => {
    const url = buildReverseUrl(config, -20.9, 29.0);
    expect(url).toContain('nominatim-reverse');
    expect(url).toContain('lat=-20.9');
    expect(url).toContain('lon=29');
  });
});

describe('nominatim client', () => {
  it('sends the publishable key as both apikey and bearer', async () => {
    // Parameters must be declared even though the body ignores them: without
    // them vi.fn infers a zero-arg signature, `mock.calls[0]` is the empty
    // tuple, and reading `[1]` to assert on the headers fails to compile.
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse([]),
    );
    const client = createNominatimClient({ config, fetchImpl: fetchImpl as unknown as typeof fetch });
    await client.search('q');

    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    const h = init.headers as Record<string, string>;
    expect(h.apikey).toBe('pk_test_123');
    expect(h.Authorization).toBe('Bearer pk_test_123');
  });

  it('returns results on success', async () => {
    const rows = [{ place_id: 1, display_name: 'Somewhere' }];
    const client = createNominatimClient({
      config,
      fetchImpl: (async () => jsonResponse(rows)) as unknown as typeof fetch,
    });
    await expect(client.search('q')).resolves.toEqual(rows);
  });

  it('throws on a non-ok response', async () => {
    const client = createNominatimClient({
      config,
      fetchImpl: (async () => jsonResponse(null, false)) as unknown as typeof fetch,
    });
    await expect(client.search('q')).rejects.toThrow('Place search failed');
  });

  it('resolves to [] when the caller aborts, rather than throwing', async () => {
    // A suggestion lookup cancelled by the next keystroke is normal, not an
    // error — surfacing it would flash a failure while the user is still typing.
    const controller = new AbortController();
    const client = createNominatimClient({
      config,
      fetchImpl: ((_u: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        })) as unknown as typeof fetch,
    });

    const pending = client.search('q', 10, undefined, false, controller.signal);
    controller.abort();
    await expect(pending).resolves.toEqual([]);
  });

  it('resolves reverse() to null on timeout', async () => {
    const client = createNominatimClient({
      config,
      timeoutMs: 5,
      fetchImpl: ((_u: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        })) as unknown as typeof fetch,
    });
    await expect(client.reverse(-20.9, 29.0)).resolves.toBeNull();
  });
});
