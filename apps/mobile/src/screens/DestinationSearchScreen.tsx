/**
 * Destination search — increment 3b.
 *
 * Presented as a modal over the Ride screen. Results come from all three web
 * sources (landmarks, streets, OSM) merged and ranked by `@cruixe/core`; the
 * source of each row is shown, because during the migration "why did this
 * result appear" is a question worth being able to answer at a glance.
 *
 * Styled directly from `theme/` — `components/ui/` is sequenced after the slice.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TownConfig } from '@cruixe/core';

import {
  useDestinationSearch,
  type DestinationResult,
  type DestinationSource,
} from '../search/useDestinationSearch';
import { defaultTheme as t } from '../theme';

const SOURCE_LABEL: Record<DestinationSource, string> = {
  landmark: 'Landmark',
  street: 'Street',
  osm: 'Map',
};

export default function DestinationSearchScreen({
  town,
  userCoords,
  onSelect,
  onClose,
}: {
  town: TownConfig;
  userCoords?: { lat: number; lng: number } | null;
  onSelect: (result: DestinationResult) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { results, loading, error } = useDestinationSearch({ query, town, userCoords });

  const typedEnough = query.trim().length >= 3;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={`Search in ${town.name}`}
          placeholderTextColor={t.colors.mutedForeground}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={t.colors.brandRed} />
          <Text style={styles.statusText}>Searching landmarks, streets and map…</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!typedEnough ? (
        <Text style={styles.hint}>Type at least 3 characters to search.</Text>
      ) : null}

      {typedEnough && !loading && !error && results.length === 0 ? (
        <Text style={styles.hint}>No places found for “{query.trim()}”.</Text>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.subtitle ? (
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
            <View style={styles.sourceTag}>
              <Text style={styles.sourceTagText}>{SOURCE_LABEL[item.source]}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background, paddingHorizontal: 16, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    height: 48,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
    paddingHorizontal: 12,
    fontSize: 15,
    color: t.colors.cardForeground,
  },
  cancel: { fontSize: 14, fontWeight: '700', color: t.colors.primary },

  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 13, color: t.colors.mutedForeground },
  error: { fontSize: 13, color: t.colors.destructive },
  hint: { fontSize: 13, color: t.colors.mutedForeground },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  rowPressed: { backgroundColor: t.colors.secondary },
  rowMain: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '600', color: t.colors.foreground },
  rowSubtitle: { fontSize: 12, color: t.colors.mutedForeground },
  sourceTag: {
    backgroundColor: t.colors.secondary,
    borderRadius: t.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceTagText: { fontSize: 10, fontWeight: '800', color: t.colors.mutedForeground, letterSpacing: 0.5 },
});
