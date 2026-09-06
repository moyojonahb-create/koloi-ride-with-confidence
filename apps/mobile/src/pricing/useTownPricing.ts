/**
 * Town pricing lookup — the React half of web's `useTownPricing.ts`.
 *
 * The arithmetic lives in `@cruixe/core` (`pricing/fare.ts`, `pricing/tiers.ts`)
 * and is unit-tested there. This is only the Supabase read and its cache.
 *
 * The module-level cache is carried over from web deliberately. Pricing changes
 * rarely and a town's row is re-read on every mount otherwise — on this network
 * that is a visible delay before a fare can be shown at all.
 */

import { useEffect, useState } from 'react';
import { DEFAULT_PRICING, type TownPricingConfig } from '@cruixe/core';

import { requireSupabase } from '../core/supabase';

const cache: Record<string, TownPricingConfig> = {};

export function useTownPricing(townId: string | null) {
  const [pricing, setPricing] = useState<TownPricingConfig>(
    townId && cache[townId] ? cache[townId] : DEFAULT_PRICING,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!townId) {
      setPricing(DEFAULT_PRICING);
      return;
    }
    if (cache[townId]) {
      setPricing(cache[townId]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const { data } = await requireSupabase()
          .from('town_pricing')
          .select('*')
          .eq('town_id', townId)
          .maybeSingle();

        if (cancelled) return;

        if (data) {
          // Spread over the defaults so a partial row cannot produce undefined
          // multipliers, which would make the fare NaN rather than wrong.
          const config = { ...DEFAULT_PRICING, ...(data as Partial<TownPricingConfig>) } as TownPricingConfig;
          cache[townId] = config;
          setPricing(config);
        } else {
          setPricing(DEFAULT_PRICING);
        }
      } catch {
        // A pricing read failure must not block the screen: the defaults are a
        // real, shippable fallback, which is why they exist in core.
        if (!cancelled) setPricing(DEFAULT_PRICING);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [townId]);

  return { pricing, loading };
}
