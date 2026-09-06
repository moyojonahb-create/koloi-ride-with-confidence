/**
 * A single placeholder for every screen the navigation shell declares but this
 * increment does not build.
 *
 * One shared component rather than 17 stub files: the shell's *shape* is the
 * deliverable here, and stub files would be review noise that later has to be
 * deleted. Each placeholder names the web route it replaces, so the mapping
 * stays legible while the screens are filled in.
 */

import { StyleSheet, Text, View } from 'react-native';

import { defaultTheme as t } from '../theme';

export function makePlaceholder(title: string, webRoute: string) {
  function Placeholder() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.route}>{webRoute}</Text>
        <Text style={styles.note}>Not built yet — navigation shell only.</Text>
      </View>
    );
  }
  Placeholder.displayName = `Placeholder(${title})`;
  return Placeholder;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 24,
    backgroundColor: t.colors.background,
  },
  title: { fontSize: 20, fontWeight: '700', color: t.colors.foreground },
  route: { fontSize: 13, color: t.colors.primary, fontWeight: '600' },
  note: { fontSize: 12, color: t.colors.mutedForeground },
});
