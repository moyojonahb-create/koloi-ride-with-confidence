/**
 * DIVERGENCE-004 — guards the auth identifier rules duplicated between
 * `apps/mobile/src/auth/identity.ts` and the web app's `src/pages/Auth.tsx`.
 *
 * **Why this test reaches outside `packages/core`.** Core does not own this
 * logic yet and deliberately should not: the web copy lives in a page
 * component inside the byte-identical web app, so promoting it now would mean
 * touching `src/pages/Auth.tsx`. Until that happens the rules exist twice, and
 * an unguarded duplicate of *auth semantics* is how you get a user who can sign
 * in on one platform and not the other, with no error explaining why.
 *
 * So this suite does two things a normal unit test does not:
 *
 *  1. Imports the mobile module across the package boundary and asserts its
 *     behaviour. Legitimate here because the whole point is comparing across
 *     that boundary — and the module is pure TypeScript with no React Native
 *     imports, so it runs under Node unchanged.
 *  2. Reads the *web* source and asserts the load-bearing literals are still
 *     present. Behavioural tests on mobile alone cannot catch web moving.
 *
 * Both halves are deleted when the module is promoted into core and both apps
 * import it. See DIVERGENCE.md.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  formatPhone,
  isNetworkError,
  loginIdentifierToEmail,
  phoneToSyntheticEmail,
} from '../../../../apps/mobile/src/auth/identity';

const REPO_ROOT = resolve(__dirname, '../../../..');
const WEB_AUTH = resolve(REPO_ROOT, 'src/pages/Auth.tsx');

describe('DIVERGENCE-004: auth identity rules match web', () => {
  describe('mobile behaviour', () => {
    it('promotes a local 0-prefixed number to +263', () => {
      expect(formatPhone('0771234567')).toBe('+263771234567');
      expect(formatPhone('077 123 4567')).toBe('+263771234567');
      expect(formatPhone('077-123-4567')).toBe('+263771234567');
    });

    it('leaves an already-international number alone', () => {
      expect(formatPhone('+263771234567')).toBe('+263771234567');
    });

    it('builds the synthetic email Supabase actually authenticates against', () => {
      // The `+` is stripped and the digits become the local part. Getting this
      // wrong makes every phone-registered account unreachable.
      expect(phoneToSyntheticEmail('0771234567')).toBe('263771234567@pickme.phone');
      expect(phoneToSyntheticEmail('+263771234567')).toBe('263771234567@pickme.phone');
    });

    it('passes an email through untouched', async () => {
      const rpc = async () => {
        throw new Error('nickname RPC must not be called for an email');
      };
      expect(await loginIdentifierToEmail('you@example.com', rpc)).toBe('you@example.com');
    });

    it('resolves a phone number without consulting the nickname RPC', async () => {
      const rpc = async () => {
        throw new Error('nickname RPC must not be called for a phone number');
      };
      expect(await loginIdentifierToEmail('0771234567', rpc)).toBe(
        '263771234567@pickme.phone',
      );
    });

    it('falls back to the nickname RPC, and to the raw value when it misses', async () => {
      expect(await loginIdentifierToEmail('tendai', async () => 'real@example.com')).toBe(
        'real@example.com',
      );
      // A miss must not become a lookup failure — web sends the raw value on.
      expect(await loginIdentifierToEmail('tendai', async () => null)).toBe('tendai');
    });

    it('classifies only transient network failures as retryable', () => {
      for (const m of [
        'Failed to fetch',
        'NetworkError when attempting to fetch',
        'Load failed',
        'Network request failed',
      ]) {
        expect(isNetworkError(new Error(m))).toBe(true);
      }
      // The one that must never be retried: retrying a rejected credential
      // risks rate-limiting or locking the account.
      expect(isNetworkError(new Error('Invalid login credentials'))).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('web source still carries the same rules', () => {
    const web = readFileSync(WEB_AUTH, 'utf8');

    it.each([
      ["'+263'", "+263"],
      ['@pickme.phone', '@pickme.phone'],
      ['email_for_nickname', 'email_for_nickname'],
    ])('web Auth.tsx still contains %s', (_label, literal) => {
      expect(web).toContain(literal);
    });

    it('web still strips + when building the synthetic email', () => {
      // Guards the exact transformation, not just the domain: a change from
      // replace(/\+/g,'') to something else would silently repoint every
      // phone login at an address that does not exist.
      expect(web).toMatch(/replace\(\/\\\+\/g,\s*''\)/);
    });
  });
});
