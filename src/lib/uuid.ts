/**
 * UUID utilities.
 *
 * Why:
 * - `crypto.randomUUID()` is not available in some older Android WebViews
 *   (common in Capacitor apps), causing runtime crashes.
 * - This helper uses the best available source of entropy.
 */

function bytesToUuid(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }

  // 8-4-4-4-12
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  );
}

/**
 * Generate an RFC4122 v4 UUID.
 *
 * Prefers:
 * - `crypto.randomUUID()`
 * - `crypto.getRandomValues()`
 * Falls back to Math.random() if necessary.
 */
export function uuid(): string {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;

  if (c?.randomUUID) return c.randomUUID();

  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);

    // RFC4122 v4 bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return bytesToUuid(bytes);
  }

  // Last resort fallback (lower entropy). Still fine for client-side ids.
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}
