/**
 * Stub map — a deliberate non-map, per §5a of MIGRATION_SCREEN_INVENTORY.md.
 *
 * This renders coordinates as text instead of drawing them, and that is the
 * point. Introducing `@rnmapbox/maps` now would put the slice's largest unknown
 * in front of proof of everything else, and would make failure ambiguous: a
 * marker that never appears is equally consistent with a dropped websocket, a
 * broken background-location handoff, a `packages/core` mapping bug, or a
 * misconfigured map SDK — and the symptom cannot tell you which.
 *
 * Reading the numbers directly removes the rendering layer from the diagnosis.
 * When positions are proven to arrive correctly, Mapbox becomes a contained
 * problem: draw coordinates already known to be good.
 *
 * **Do not quietly grow this into a map.** Its replacement is a separate,
 * designed piece of work — the web app drives Mapbox GL imperatively via
 * `document.createElement`, while `@rnmapbox/maps` is declarative, so the
 * interaction model changes, not just the library.
 */

import { StyleSheet, Text, View } from 'react-native';

import { defaultTheme as t } from '../theme';

export interface StubMapPoint {
  label: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
}

export default function StubMap({
  points,
  caption,
}: {
  points: StubMapPoint[];
  caption?: string;
}) {
  return (
    <View style={styles.container} accessibilityLabel="Map placeholder showing coordinates">
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>STUB MAP</Text>
        </View>
        <Text style={styles.badgeNote}>coordinates only — no map SDK yet</Text>
      </View>

      {points.length === 0 ? (
        <Text style={styles.empty}>No position yet.</Text>
      ) : (
        points.map((p) => (
          <View key={p.label} style={styles.point}>
            <Text style={styles.pointLabel}>{p.label}</Text>
            <Text style={styles.pointCoords}>
              {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
            </Text>
            {p.accuracy != null ? (
              <Text style={styles.pointAccuracy}>±{Math.round(p.accuracy)} m</Text>
            ) : null}
          </View>
        ))
      )}

      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: t.colors.secondary,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderStyle: 'dashed',
    padding: 14,
    gap: 10,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: t.colors.brandYellow,
    borderRadius: t.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: t.colors.accentForeground, letterSpacing: 1 },
  badgeNote: { fontSize: 11, color: t.colors.mutedForeground },
  empty: { fontSize: 13, color: t.colors.mutedForeground, paddingVertical: 8 },
  point: { gap: 2 },
  pointLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: t.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pointCoords: {
    fontSize: 16,
    fontWeight: '700',
    color: t.colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  pointAccuracy: { fontSize: 12, color: t.colors.mutedForeground, fontVariant: ['tabular-nums'] },
  caption: { fontSize: 12, color: t.colors.mutedForeground },
});
