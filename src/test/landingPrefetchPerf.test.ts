/**
 * Performance budget for the landing-page prefetch strategy.
 *
 * The smart prefetcher (src/lib/prefetchPages.ts) is fire-and-forget and
 * runs in idle time. The risk is that a future change accidentally:
 *   - blocks the main thread by selecting hundreds of bundles for an
 *     anonymous visitor, or
 *   - synchronously chains imports inside `selectPagesForUser`.
 *
 * This test measures the wall-clock cost of *selecting* the prefetch
 * list for an anonymous landing visitor (the most performance-sensitive
 * case) and compares it to selecting the full authenticated-admin list.
 *
 * Thresholds are intentionally generous — they only fail on order-of-
 * magnitude regressions, not normal CI noise.
 */
import { describe, it, expect } from "vitest";
import { selectPagesForUser } from "@/lib/prefetchPages";

const ITERATIONS = 200;

function bench(fn: () => void): number {
  // warm-up
  for (let i = 0; i < 10; i++) fn();
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) fn();
  return (performance.now() - start) / ITERATIONS;
}

describe("landing-page prefetch performance budget", () => {
  it("anonymous selection is fast and bounded in size", () => {
    const list = selectPagesForUser({
      isAuthenticated: false, isDriver: false, isAdmin: false,
    });
    // anonymous visitors should never receive >20 lazy bundle loaders
    expect(list.length).toBeLessThanOrEqual(20);

    const avgMs = bench(() =>
      selectPagesForUser({ isAuthenticated: false, isDriver: false, isAdmin: false }),
    );
    // 5ms per call is ~1000x slower than expected — fail well before users notice
    expect(avgMs, `anonymous selectPagesForUser took ${avgMs.toFixed(3)}ms (budget 5ms)`)
      .toBeLessThan(5);
  });

  it("anonymous selection is at least as cheap as full admin selection", () => {
    const anon = bench(() =>
      selectPagesForUser({ isAuthenticated: false, isDriver: false, isAdmin: false }),
    );
    const admin = bench(() =>
      selectPagesForUser({ isAuthenticated: true, isDriver: true, isAdmin: true }),
    );
    // anon should be strictly cheaper or comparable (sub-1ms wiggle room)
    expect(
      anon <= admin + 1,
      `anonymous (${anon.toFixed(3)}ms) should be ≤ admin (${admin.toFixed(3)}ms) + 1ms`,
    ).toBe(true);
  });

  it("disabling prefetch is even cheaper than enabling it (no hidden eager work)", () => {
    // Simulated "prefetch disabled" baseline: a no-op function call.
    const disabled = bench(() => { /* prefetch disabled */ });
    const enabled = bench(() =>
      selectPagesForUser({ isAuthenticated: false, isDriver: false, isAdmin: false }),
    );
    // Enabled selection should not be wildly more expensive than the no-op
    // baseline. Threshold = 10ms (catches accidental sync `await import()`).
    expect(
      enabled - disabled,
      `prefetch overhead = ${(enabled - disabled).toFixed(3)}ms (budget 10ms)`,
    ).toBeLessThan(10);
  });
});
