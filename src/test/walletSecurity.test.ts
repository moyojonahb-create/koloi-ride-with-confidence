/**
 * Wallet security guarantees:
 *  1. PIN hashes (the `wallet_pins` table or any `pin_hash`/`wallet_pin` field)
 *     must NEVER be returned to the client by any code path.
 *  2. Wallet pages must enforce the PIN gate before exposing balance or
 *     transactions.
 *
 * These tests are static-analysis style (no live DB) so they run fast in CI
 * and catch regressions if a future change tries to `select('*')` from a
 * wallet table or bypasses the WalletPinModal.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const allFiles = walk(SRC);
const clientFiles = allFiles.filter(
  (f) =>
    !f.includes(`${"src"}/test/`) &&
    !f.endsWith(".test.ts") &&
    !f.endsWith(".test.tsx") &&
    !f.endsWith(".spec.ts") &&
    !f.endsWith(".spec.tsx")
);

describe("wallet PIN hash exposure", () => {
  it("no client code selects pin_hash or wallet_pin column", () => {
    const offenders: string[] = [];
    for (const f of clientFiles) {
      const text = readFileSync(f, "utf8");
      // Any explicit reference to pin_hash / wallet_pin column on the client
      // is a regression — those values must stay server-side only.
      if (/\bpin_hash\b/.test(text) || /\bwallet_pin\b/.test(text)) {
        offenders.push(f);
      }
    }
    expect(offenders, `pin column referenced in client: ${offenders.join(", ")}`).toEqual([]);
  });

  it("no client code reads from the wallet_pins table", () => {
    const offenders: string[] = [];
    for (const f of clientFiles) {
      const text = readFileSync(f, "utf8");
      // .from('wallet_pins') / .from("wallet_pins")
      if (/\.from\(\s*['"`]wallet_pins['"`]\s*\)/.test(text)) {
        offenders.push(f);
      }
    }
    expect(offenders, `wallet_pins table queried from client: ${offenders.join(", ")}`).toEqual([]);
  });

  it("PIN operations only go through the wallet-pin edge function", () => {
    // The hook that performs PIN operations must call /functions/v1/wallet-pin
    const hook = readFileSync(join(SRC, "hooks/useWalletPin.ts"), "utf8");
    expect(hook).toMatch(/functions\/v1\/wallet-pin/);
    // and must never read pin_hash directly
    expect(hook).not.toMatch(/pin_hash/);
  });
});

describe("wallet PIN gate enforcement", () => {
  const riderPage = readFileSync(join(SRC, "pages/RiderWalletPage.tsx"), "utf8");
  const driverPage = readFileSync(join(SRC, "pages/DriverWalletPage.tsx"), "utf8");

  it("rider wallet page mounts the PIN modal and blocks balance until verified", () => {
    expect(riderPage).toMatch(/WalletPinModal/);
    // Balance/transactions must be gated behind a `pinVerified` flag.
    expect(riderPage).toMatch(/pinVerified/);
    expect(riderPage).toMatch(/!\s*pinVerified/);
  });

  it("driver wallet page mounts the PIN modal and blocks balance until verified", () => {
    expect(driverPage).toMatch(/WalletPinModal/);
    expect(driverPage).toMatch(/pinVerified/);
    expect(driverPage).toMatch(/!\s*pinVerified/);
  });
});
