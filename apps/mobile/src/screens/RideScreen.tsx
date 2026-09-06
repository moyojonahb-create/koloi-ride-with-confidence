/**
 * Ride — increment 3a: shell and location only.
 *
 * Scope is deliberately narrow. This proves the location path and the town
 * resolution that everything downstream depends on:
 *
 *   - foreground permission and a real GPS fix (`useDeviceLocation`)
 *   - the fix rendered through the stub map, not a map SDK (§5a)
 *   - `detectTown()` from `@cruixe/core` deciding whether that fix is even
 *     inside a service area
 *
 * NOT in this increment: destination search (3b), fare and tier selection (3c),
 * the request itself and realtime (3d). The web original — `RideView.tsx`,
 * 1,834 lines and ~50 useState hooks — is five state machines in one file; this
 * is the first.
 *
 * Styled directly from `theme/`. `components/ui/` is sequenced after the slice.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DEFAULT_TOWN,
  detectTown,
  formatFare,
  isWithinAnyServiceArea,
  type RideTierId,
} from '@cruixe/core';

import StubMap from '../components/StubMap';
import { useDeviceLocation } from '../location/useDeviceLocation';
import { useFareEstimate } from '../pricing/useFareEstimate';
import { useTownPricing } from '../pricing/useTownPricing';
import type { DestinationResult } from '../search/useDestinationSearch';
import { defaultTheme as t } from '../theme';
import DestinationSearchScreen from './DestinationSearchScreen';

export default function RideScreen() {
  const insets = useSafeAreaInsets();
  const { status, coords, error, request } = useDeviceLocation();
  const [destination, setDestination] = useState<DestinationResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<RideTierId>('economy');

  // Ask once on mount. Web prompts on first interaction instead, but a rider
  // screen whose whole purpose is "where are you" has no useful state to show
  // before the answer, and a pre-permission priming screen is already recorded
  // as backlog in the Phase 0 audit.
  useEffect(() => {
    void request();
  }, [request]);

  const town = coords ? detectTown(coords.lat, coords.lng) : DEFAULT_TOWN;
  const inServiceArea = coords ? isWithinAnyServiceArea(coords.lat, coords.lng) : false;

  const { pricing } = useTownPricing(town.id);
  const fare = useFareEstimate({
    pricing,
    pickup: coords ? { lat: coords.lat, lng: coords.lng } : null,
    dropoff: destination ? { lat: destination.lat, lng: destination.lng } : null,
  });

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text style={styles.title}>Where to?</Text>
      <Text style={styles.subtitle}>Increment 3a — shell and location</Text>

      <StubMap
        points={[
          ...(coords
            ? [{ label: 'Pickup (your location)', lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy }]
            : []),
          ...(destination
            ? [{ label: `Dropoff — ${destination.name}`, lat: destination.lat, lng: destination.lng }]
            : []),
        ]}
        caption={
          coords
            ? `Detected town: ${town.name}${inServiceArea ? '' : ' — outside any service area'}`
            : undefined
        }
      />

      <Pressable
        onPress={() => setSearchOpen(true)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.destinationField, pressed && styles.destinationFieldPressed]}
      >
        <Text style={styles.destinationLabel}>Destination</Text>
        <Text
          style={[styles.destinationValue, !destination && styles.destinationPlaceholder]}
          numberOfLines={1}
        >
          {destination ? destination.name : 'Where are you going?'}
        </Text>
        {destination?.subtitle ? (
          <Text style={styles.destinationSubtitle} numberOfLines={1}>
            {destination.subtitle}
          </Text>
        ) : null}
      </Pressable>

      <Modal
        visible={searchOpen}
        animationType="slide"
        // Both platforms: iOS honours this for the sheet, Android ignores it
        // harmlessly rather than needing a separate code path.
        presentationStyle="pageSheet"
        onRequestClose={() => setSearchOpen(false)}
      >
        <DestinationSearchScreen
          town={town}
          userCoords={coords ? { lat: coords.lat, lng: coords.lng } : null}
          onSelect={(result) => {
            setDestination(result);
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />
      </Modal>

      {status === 'loading' ? (
        <View style={styles.row}>
          <ActivityIndicator color={t.colors.brandRed} />
          <Text style={styles.rowText}>Finding your location…</Text>
        </View>
      ) : null}

      {status === 'success' && coords ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Service area</Text>
          <KV k="Town" v={town.name} />
          <KV k="Centre" v={`${town.center.lat.toFixed(4)}, ${town.center.lng.toFixed(4)}`} />
          <KV k="Radius" v={`${town.radiusKm} km`} />
          <KV
            k="You are"
            v={inServiceArea ? 'inside a service area' : 'outside any service area'}
            tone={inServiceArea ? 'ok' : 'warn'}
          />
        </View>
      ) : null}

      {status === 'denied' || status === 'unavailable' ? (
        <View style={styles.card}>
          <Text style={styles.errorTitle}>
            {status === 'denied' ? 'Location permission needed' : 'Location unavailable'}
          </Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable
            onPress={() => void request()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.tiers}>
        <Text style={styles.cardTitle}>Choose a ride</Text>
        {fare.tiers.map((tier) => {
          const active = tier.id === selectedTier;
          return (
            <Pressable
              key={tier.id}
              onPress={() => setSelectedTier(tier.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.tier,
                active && styles.tierActive,
                pressed && styles.tierPressed,
              ]}
            >
              <View style={styles.tierMain}>
                <Text style={[styles.tierName, active && styles.tierNameActive]}>{tier.name}</Text>
                <Text style={styles.tierMeta}>
                  {tier.capacity} seat{tier.capacity === 1 ? '' : 's'} · {tier.badge}
                </Text>
              </View>
              <View style={styles.tierRight}>
                {/* Null price is a value, not a gap — never fabricate a fare
                    before a destination exists. Web says the same. */}
                <Text style={[styles.tierPrice, active && styles.tierNameActive]}>
                  {tier.price == null ? 'See fare next' : formatFare(tier.price, fare.currencySymbol)}
                </Text>
                {tier.etaMinutes != null ? (
                  <Text style={styles.tierEta}>{tier.etaMinutes} min</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {fare.distanceKm != null ? (
        <View style={styles.estimateNote}>
          <Text style={styles.estimateTitle}>Estimate only</Text>
          <Text style={styles.estimateBody}>
            {fare.distanceKm.toFixed(2)} km straight-line, not road distance — real fares will be
            higher. OSRM routing replaces this in increment 3d.
          </Text>
        </View>
      ) : null}

      <Text style={styles.footnote}>
        The ride request itself and realtime matching arrive in increment 3d.
      </Text>
    </ScrollView>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: 'ok' | 'warn' }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text
        style={[
          styles.v,
          tone === 'ok' && { color: t.colors.primary },
          tone === 'warn' && { color: t.colors.destructive },
        ]}
      >
        {v}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: t.colors.background },
  container: { paddingHorizontal: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: t.colors.foreground },
  subtitle: { fontSize: 12, color: t.colors.mutedForeground, marginTop: -8 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { fontSize: 14, color: t.colors.mutedForeground },

  card: {
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: t.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  k: { fontSize: 13, color: t.colors.mutedForeground },
  v: { fontSize: 14, fontWeight: '700', color: t.colors.cardForeground },

  errorTitle: { fontSize: 15, fontWeight: '700', color: t.colors.destructive },
  errorBody: { fontSize: 13, color: t.colors.cardForeground },
  retry: {
    height: 44,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  retryPressed: { backgroundColor: t.colors.brandRedHover },
  retryText: { fontSize: 14, fontWeight: '700', color: t.colors.primaryForeground },

  destinationField: {
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 14,
    gap: 3,
  },
  destinationFieldPressed: { backgroundColor: t.colors.secondary },
  destinationLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: t.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  destinationValue: { fontSize: 16, fontWeight: '600', color: t.colors.cardForeground },
  destinationPlaceholder: { color: t.colors.mutedForeground, fontWeight: '400' },
  destinationSubtitle: { fontSize: 12, color: t.colors.mutedForeground },

  tiers: { gap: 8 },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
  },
  tierActive: { borderColor: t.colors.primary, borderWidth: 2 },
  tierPressed: { backgroundColor: t.colors.secondary },
  tierMain: { flex: 1, gap: 2 },
  tierName: { fontSize: 15, fontWeight: '700', color: t.colors.cardForeground },
  tierNameActive: { color: t.colors.primary },
  tierMeta: { fontSize: 12, color: t.colors.mutedForeground },
  tierRight: { alignItems: 'flex-end', gap: 2 },
  tierPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: t.colors.cardForeground,
    fontVariant: ['tabular-nums'],
  },
  tierEta: { fontSize: 12, color: t.colors.mutedForeground, fontVariant: ['tabular-nums'] },

  estimateNote: {
    backgroundColor: t.colors.secondary,
    borderRadius: t.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: t.colors.brandYellow,
    padding: 12,
    gap: 3,
  },
  estimateTitle: { fontSize: 12, fontWeight: '800', color: t.colors.secondaryForeground },
  estimateBody: { fontSize: 12, color: t.colors.mutedForeground, lineHeight: 17 },

  footnote: { fontSize: 11, color: t.colors.mutedForeground, lineHeight: 16 },
});
