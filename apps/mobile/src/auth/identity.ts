/**
 * Identifier normalisation, ported verbatim from the web app's `Auth.tsx`.
 *
 * These are load-bearing business rules, not formatting helpers:
 *
 *  - Local numbers starting `0` are Zimbabwean and become `+263…`.
 *  - An account created with a phone number has a **synthetic email** of the
 *    form `263771234567@pickme.phone`. Sign-in must reconstruct exactly that
 *    string or the credential lookup misses an account that does exist.
 *  - Anything that is neither an email nor a phone number is a nickname, and is
 *    resolved through the `email_for_nickname` RPC.
 *
 * The `@pickme.phone` domain and the legacy RPC name are retained deliberately:
 * they address live production rows, so "tidying" either would orphan accounts.
 *
 * NOTE ON PLACEMENT: this duplicates logic that currently lives in
 * `src/pages/Auth.tsx` on web, which makes it a drift candidate under the rules
 * in `packages/core/DIVERGENCE.md`. It is not in `packages/core` because core is
 * scoped as a port of `src/lib/`, and this logic lives in a page component
 * rather than a lib module — promoting it is a separate refactor with its own
 * review. Flagged rather than silently duplicated.
 */

/** Local `07…` → `+2637…`; ensures a leading `+`; strips spaces and hyphens. */
export function formatPhone(input: string): string {
  let cleaned = input.replace(/[\s-]/g, '');
  if (cleaned.startsWith('0')) cleaned = '+263' + cleaned.substring(1);
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  return cleaned;
}

/** The synthetic email a phone-registered account actually authenticates with. */
export function phoneToSyntheticEmail(phone: string): string {
  return `${formatPhone(phone).replace(/\+/g, '')}@pickme.phone`;
}

export function looksLikeEmail(value: string): boolean {
  return value.includes('@');
}

export function looksLikePhone(value: string): boolean {
  return /^\+?[0-9\s-]+$/.test(value.trim());
}

/** True when the digits are sufficient for signup — matches web's `< 9` reject. */
export function isPlausiblePhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 9;
}

/**
 * Resolves whatever the user typed into the email Supabase knows them by.
 *
 * `resolveNickname` is injected rather than importing the Supabase client, so
 * this module stays a pure unit and the RPC can be faked in a test.
 */
export async function loginIdentifierToEmail(
  identifier: string,
  resolveNickname: (nickname: string) => Promise<string | null>,
): Promise<string> {
  const v = identifier.trim();
  if (looksLikeEmail(v)) return v;
  if (looksLikePhone(v)) return phoneToSyntheticEmail(v);
  return (await resolveNickname(v)) ?? v;
}

/**
 * Web retries sign-in on transient network failures but never on a rejected
 * credential. Reproduced here because a flaky mobile link makes the distinction
 * matter more, not less — retrying a wrong password would lock the account.
 */
export function isNetworkError(error: unknown): boolean {
  const message = (error as Error | null)?.message?.toLowerCase() ?? '';
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('network request failed')
  );
}
