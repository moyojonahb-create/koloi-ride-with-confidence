/**
 * CI guard: SECURITY DEFINER grants vs maintained allowlist.
 *
 * Walks every SQL migration in `supabase/migrations/` and reconstructs the
 * final EXECUTE-grant state for each `public.*` function. Then asserts:
 *
 *   1. Wallet-related functions (anything matching WALLET_FN_RE) are
 *      executable by `authenticated` only if listed in WALLET_ALLOWED.
 *   2. No wallet-related function is executable by `anon`.
 *   3. The set of intended internal/trigger functions stays REVOKEd from
 *      both `anon` and `authenticated` (mirrors the live RLS suite).
 *
 * Static analysis only — no DB connection required, runs in every CI job.
 *
 * To intentionally expose a new wallet RPC, add it to WALLET_ALLOWED
 * AND ship a migration that GRANTs EXECUTE to authenticated.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

// Wallet-touching surface — anything users could call to move money or PINs.
const WALLET_FN_RE =
  /\b(wallet|pin|deposit|withdraw|transfer|payout|payment|earnings|fund|balance|ledger|settle|charge)\w*/i;

// The ONLY wallet-related RPCs allowed to be called by signed-in users.
// Keep in sync with src/test/walletRlsLive.test.ts → `allowed`.
const WALLET_ALLOWED = new Set<string>([
  "transfer_funds",
  "request_withdrawal",
  "pay_ride_from_wallet",
  "request_wallet_ride",
]);

// Internal trigger / cron functions that MUST stay revoked from clients.
const MUST_BE_REVOKED = [
  "generate_pickme_account",
  "set_pickme_account",
  "update_demand_zones",
  "cleanup_throttle",
  "cleanup_old_messages",
  "expire_old_rides",
  "dispatch_scheduled_rides",
  "update_driver_rating_avg",
  "generate_referral_code",
  "handle_new_user",
  "handle_new_user_wallet",
  "update_updated_at_column",
  "update_ride_negotiation_updated_at",
  "set_ride_expiry",
  "complete_trip_and_charge_flat_r4",
  "check_rate_limit",
];

type Role = "anon" | "authenticated" | "public";
interface State {
  // role -> Set of function base-names currently executable
  authenticated: Set<string>;
  anon: Set<string>;
}

// Match GRANT/REVOKE EXECUTE ON FUNCTION public.<name>(...) TO/FROM role[, role...]
const GRANT_RE =
  /\b(GRANT|REVOKE)\s+EXECUTE\s+ON\s+FUNCTION\s+public\.([a-z_][a-z0-9_]*)\s*\([^)]*\)\s+(?:TO|FROM)\s+([a-z_,\s]+);/gi;

function buildState(): State {
  const state: State = { authenticated: new Set(), anon: new Set() };

  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS, f), "utf8");
    let m: RegExpExecArray | null;
    while ((m = GRANT_RE.exec(sql)) !== null) {
      const op = m[1].toUpperCase();
      const fnName = m[2];
      const roles = m[3]
        .split(",")
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean) as Role[];
      for (const role of roles) {
        if (role !== "anon" && role !== "authenticated" && role !== "public") continue;
        const targets: Array<"anon" | "authenticated"> =
          role === "public" ? ["anon", "authenticated"] : [role];
        for (const t of targets) {
          if (op === "GRANT") state[t].add(fnName);
          else state[t].delete(fnName);
        }
      }
    }
  }
  return state;
}

describe("SECURITY DEFINER allowlist (CI guard)", () => {
  const state = buildState();

  it("no wallet-related function is executable by `anon`", () => {
    const leaked = [...state.anon].filter((fn) => WALLET_FN_RE.test(fn));
    expect(
      leaked,
      `wallet RPCs leaked to anon role: ${leaked.join(", ")}`,
    ).toEqual([]);
  });

  it("only allowlisted wallet RPCs are executable by `authenticated`", () => {
    const walletExposed = [...state.authenticated].filter((fn) =>
      WALLET_FN_RE.test(fn),
    );
    const unexpected = walletExposed.filter((fn) => !WALLET_ALLOWED.has(fn));
    expect(
      unexpected,
      `Unexpected wallet RPCs callable by authenticated. Add to WALLET_ALLOWED if intentional, else revoke. Found: ${unexpected.join(", ")}`,
    ).toEqual([]);
  });

  it("internal/trigger functions remain revoked from anon AND authenticated", () => {
    const stillExposed: string[] = [];
    for (const fn of MUST_BE_REVOKED) {
      if (state.anon.has(fn)) stillExposed.push(`anon:${fn}`);
      if (state.authenticated.has(fn)) stillExposed.push(`authenticated:${fn}`);
    }
    expect(
      stillExposed,
      `Internal funcs still executable by clients: ${stillExposed.join(", ")}`,
    ).toEqual([]);
  });
});
