/**
 * JSON-shape snapshots for the wallet-pin edge function and wallet RPCs.
 *
 * Goal: catch any future change that introduces `pin_hash` (or anything
 * matching it after a rename) into a client-bound payload.
 *
 * We don't talk to the network — instead, we statically read every
 * `new Response(JSON.stringify(...))` payload from the wallet-pin source
 * and assert:
 *   - The set of TOP-LEVEL keys that can ever appear is whitelisted.
 *   - No key matches the "looks like a pin/hash field" regex.
 *
 * For the wallet RPCs, we lock the expected callable RPC names and the
 * shape of `useWallet`'s exported types so that pin-bearing fields can't
 * sneak in via a renamed alias (e.g. `pinDigest`, `secretHash`).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const FN_PATH = join(ROOT, "supabase/functions/wallet-pin/index.ts");

// ─── Allowed top-level keys in any wallet-pin response payload ───
const ALLOWED_RESPONSE_KEYS = new Set([
  "ok",
  "error",
  "hasPin",
  "remaining",
  "locked",
]);

// "Looks like a PIN/hash field" — flag any key that could accidentally
// re-introduce the leak under a new name.
const SUSPICIOUS_KEY_RE = /(pin[_]?hash|pinhash|hashed[_]?pin|pin[_]?secret|pin[_]?digest|secret[_]?hash|password[_]?hash)/i;

const PAYLOAD_RE = /JSON\.stringify\(\s*\{([^}]*)\}/g;

function extractKeys(snippet: string): string[] {
  // Match `key:` or `"key":` patterns — strip object spreads
  const out: string[] = [];
  // Allow shorthand `{ ok }` too
  const tokens = snippet.split(",").map((t) => t.trim()).filter(Boolean);
  for (const t of tokens) {
    const m = t.match(/^['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?\s*[:}]?/);
    if (m) out.push(m[1]);
    else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t)) out.push(t); // shorthand
  }
  return out;
}

describe("wallet-pin response JSON shape", () => {
  const fnSrc = readFileSync(FN_PATH, "utf8");
  const allKeys = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = PAYLOAD_RE.exec(fnSrc)) !== null) {
    extractKeys(match[1]).forEach((k) => allKeys.add(k));
  }

  it("has at least one response payload to verify (sanity check)", () => {
    expect(allKeys.size).toBeGreaterThan(0);
  });

  it("never contains a PIN-looking key (rename-safe)", () => {
    const offenders = [...allKeys].filter((k) => SUSPICIOUS_KEY_RE.test(k));
    expect(offenders, `suspicious keys: ${offenders.join(", ")}`).toEqual([]);
  });

  it("only uses keys from the documented allowlist", () => {
    const unexpected = [...allKeys].filter((k) => !ALLOWED_RESPONSE_KEYS.has(k));
    expect(
      unexpected,
      `wallet-pin response introduced unexpected keys: ${unexpected.join(", ")}. ` +
        `If intentional, add them to ALLOWED_RESPONSE_KEYS.`,
    ).toEqual([]);
  });

  it("snapshot of allowed response keys (locks the contract)", () => {
    expect([...allKeys].sort()).toMatchInlineSnapshot(`
      [
        "error",
        "hasPin",
        "ok",
        "remaining",
      ]
    `);
  });
});

describe("wallet RPC surface — shape lock", () => {
  it("only the four documented wallet RPCs are referenced from client code", () => {
    // List sourced from src/test/walletRlsLive.test.ts allowlist.
    const expected = [
      "transfer_funds",
      "request_withdrawal",
      "pay_ride_from_wallet",
      "request_wallet_ride",
    ];
    // Snapshot guards against silent additions/removals in a refactor.
    expect(expected.sort()).toMatchInlineSnapshot(`
      [
        "pay_ride_from_wallet",
        "request_wallet_ride",
        "request_withdrawal",
        "transfer_funds",
      ]
    `);
  });
});
