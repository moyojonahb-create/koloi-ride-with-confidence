/**
 * Lightweight haptic feedback utility.
 * Uses the Vibration API where available; no-ops silently otherwise.
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const patterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 30, 10],
  error: [50, 30, 50],
};

export function haptic(style: HapticStyle = 'light') {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(patterns[style]);
    }
  } catch {
    // silently ignore — not all browsers support vibrate
  }
}
