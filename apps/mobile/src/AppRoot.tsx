/**
 * Composition root for the CruiXe app shell.
 *
 * Order matters: SafeAreaProvider must wrap the navigator (screens read insets
 * during their first render), and AuthProvider must wrap it too because
 * RootNavigator selects its branch from session state.
 *
 * The config gate sits outermost. A build with missing `EXPO_PUBLIC_*` values
 * cannot create a Supabase client, so rendering the navigator would fail inside
 * a provider with no useful message. Core throws a `CoreConfigError` naming
 * every missing key at once; this renders it instead of crashing.
 */

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { AuthProvider } from './auth/AuthProvider';
import { coreConfigResult } from './core/config';
import RootNavigator from './navigation/RootNavigator';
import { defaultTheme as t } from './theme';

function ConfigError({ error }: { error: Error }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CruiXe is misconfigured</Text>
      <Text style={styles.body}>{error.message}</Text>
      <Text style={styles.hint}>
        Set the EXPO_PUBLIC_* values in apps/mobile/.env and restart Metro.
      </Text>
    </View>
  );
}

export default function AppRoot() {
  if (!coreConfigResult.ok) {
    return (
      <SafeAreaProvider>
        <ConfigError error={coreConfigResult.error} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
    backgroundColor: t.colors.background,
  },
  title: { fontSize: 18, fontWeight: '800', color: t.colors.destructive },
  body: { fontSize: 13, color: t.colors.foreground, textAlign: 'center' },
  hint: { fontSize: 12, color: t.colors.mutedForeground, textAlign: 'center' },
});
