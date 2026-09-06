/**
 * React Native theme, resolved from the canonical tokens in `@cruixe/core`.
 *
 * Two rules govern this file, and both come from DIVERGENCE-003:
 *
 * 1. **Brand colours are read from `theme.brandHex`, never from
 *    `hslToHex(theme.brand.red)`.** The CSS custom properties are rounded HSL
 *    approximations — `#B81104` is `hsl(4.33 95.7% 36.9%)` but ships as
 *    `4 96% 37%`, which converts back to `#B91004`. One step off in two
 *    channels. Mobile renders the correct red; web is accepted as-is because
 *    fixing it means editing Lovable-regenerated CSS.
 *
 * 2. **Semantic roles that point at a brand colour resolve to the canonical
 *    hex too.** `light.semantic.primary` is literally the same HSL string as
 *    `light.brand.red`, so converting it numerically would reintroduce exactly
 *    the drift rule 1 exists to prevent — through the back door, on the single
 *    most visible colour in the app. `resolveColor()` below checks brand
 *    identity first and only falls back to conversion for non-brand values.
 *
 * Nothing here re-derives values from the web app's HSL variables, and nothing
 * here is a reusable UI primitive — `components/ui/` is deliberately scheduled
 * after the vertical slice, so screens in this increment style themselves
 * directly from these tokens.
 */

import {
  hslToHex,
  radius,
  resolveTheme,
  typography,
  type Hsl,
  type Theme as CoreTheme,
  type ThemeName,
} from '@cruixe/core';

/**
 * Resolves one token to a hex string, preferring the canonical brand hex.
 *
 * The brand HSL triplets are the *rounded* form. When a semantic token's value
 * is identical to one of them, the exact hex is known and must win over
 * arithmetic on the rounded value.
 */
function resolveColor(value: Hsl, theme: CoreTheme): string {
  if (value === theme.brand.red) return theme.brandHex.red;
  if (value === theme.brand.redDark) return theme.brandHex.redDark;
  if (value === theme.brand.yellow) return theme.brandHex.yellow;
  return hslToHex(value);
}

export interface AppThemeColors {
  // Semantic roles — what screens should reach for.
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  primaryLight: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;

  // Brand, canonical. Use these when the colour must be the brand colour
  // rather than whatever role it currently fills.
  brandRed: string;
  brandRedDark: string;
  brandRedHover: string;
  brandYellow: string;
}

export interface AppTheme {
  name: ThemeName;
  /** false for the pink themes — no published hex exists, so those are derived. */
  brandCanonical: boolean;
  colors: AppThemeColors;
  radius: typeof radius;
  typography: typeof typography;
}

function toAppTheme(theme: CoreTheme): AppTheme {
  const c = (value: Hsl) => resolveColor(value, theme);
  const s = theme.semantic;

  return {
    name: theme.name,
    brandCanonical: theme.brandHex.canonical,
    colors: {
      background: c(s.background),
      foreground: c(s.foreground),
      card: c(s.card),
      cardForeground: c(s.cardForeground),
      primary: c(s.primary),
      primaryForeground: c(s.primaryForeground),
      primaryLight: c(s.primaryLight),
      secondary: c(s.secondary),
      secondaryForeground: c(s.secondaryForeground),
      muted: c(s.muted),
      mutedForeground: c(s.mutedForeground),
      accent: c(s.accent),
      accentForeground: c(s.accentForeground),
      destructive: c(s.destructive),
      destructiveForeground: c(s.destructiveForeground),
      border: c(s.border),
      input: c(s.input),
      ring: c(s.ring),

      brandRed: theme.brandHex.red,
      brandRedDark: theme.brandHex.redDark,
      brandRedHover: theme.brandHex.redHover,
      brandYellow: theme.brandHex.yellow,
    },
    radius,
    typography,
  };
}

/**
 * Pick the theme for the current appearance and audience.
 *
 * `female` mirrors the web app's women-only theme, which is auto-enabled for
 * female drivers in `DriverDashboard.tsx`. It is threaded through here so the
 * mobile app cannot silently drop a shipped feature, even though nothing in
 * this increment sets it yet.
 */
export function getTheme(opts: { dark?: boolean; female?: boolean } = {}): AppTheme {
  return toAppTheme(resolveTheme(opts));
}

/** Default light theme, for modules that need a theme before context exists. */
export const defaultTheme: AppTheme = getTheme({});

export type { ThemeName };
