/**
 * The navigation shell, replacing the web app's React Router tree.
 *
 * **The AuthGuard disappears.** On web, `<AuthGuard>` wraps 20+ routes
 * individually in `App.tsx`. Here the authenticated and unauthenticated stacks
 * are two branches of one conditional, selected by session state — so the guard
 * is not ported 20 times, it stops existing. An unauthenticated user cannot
 * navigate to a protected screen because those screens are not mounted, which
 * is a stronger guarantee than a wrapper that runs after the route matches.
 *
 * Screens this increment does not build are rendered by a shared placeholder.
 * The shape is per §4 of MIGRATION_SCREEN_INVENTORY.md and is deliberately
 * complete, so the next increments fill screens in rather than restructuring.
 */

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthProvider';
import AuthScreen from '../screens/AuthScreen';
import RideScreen from '../screens/RideScreen';
import { makePlaceholder } from '../screens/Placeholder';
import { defaultTheme as t } from '../theme';
import type {
  AuthStackParamList,
  DriverTabParamList,
  RiderTabParamList,
  RootStackParamList,
} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const RiderTabNav = createBottomTabNavigator<RiderTabParamList>();
const DriverTabNav = createBottomTabNavigator<DriverTabParamList>();

/**
 * Which tab set to mount. Web resolves this through `useUserRole`, which is not
 * ported yet — so this is a fixed 'rider' for now rather than a guess dressed
 * up as a lookup. Wiring it is a prerequisite for the driver increments, not
 * for this one.
 */
function useRole(): 'rider' | 'driver' {
  return 'rider';
}

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: t.colors.primary,
  tabBarInactiveTintColor: t.colors.mutedForeground,
  tabBarStyle: { backgroundColor: t.colors.card, borderTopColor: t.colors.border },
} as const;

function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Auth" component={AuthScreen} />
      <AuthStackNav.Screen name="Signup" component={makePlaceholder('Sign up', '/signup')} />
      <AuthStackNav.Screen
        name="ResetPassword"
        component={makePlaceholder('Reset password', '/reset-password')}
      />
    </AuthStackNav.Navigator>
  );
}

function RiderTabs() {
  return (
    <RiderTabNav.Navigator screenOptions={tabScreenOptions}>
      <RiderTabNav.Screen name="RideTab" component={RideScreen} options={{ title: 'Ride' }} />
      <RiderTabNav.Screen name="HistoryTab" component={makePlaceholder('History', '/history')} options={{ title: 'History' }} />
      <RiderTabNav.Screen name="WalletTab" component={makePlaceholder('Wallet', '/wallet')} options={{ title: 'Wallet' }} />
      <RiderTabNav.Screen name="ProfileTab" component={makePlaceholder('Profile', '/profile')} options={{ title: 'Profile' }} />
    </RiderTabNav.Navigator>
  );
}

function DriverTabs() {
  return (
    <DriverTabNav.Navigator screenOptions={tabScreenOptions}>
      <DriverTabNav.Screen name="DashboardTab" component={makePlaceholder('Dashboard', '/driver/dashboard')} options={{ title: 'Dashboard' }} />
      <DriverTabNav.Screen name="RequestsTab" component={makePlaceholder('Requests', '/driver/requests')} options={{ title: 'Requests' }} />
      <DriverTabNav.Screen name="TripsTab" component={makePlaceholder('Trips', '/driver/trips')} options={{ title: 'Trips' }} />
      <DriverTabNav.Screen name="DriverWalletTab" component={makePlaceholder('Wallet', '/driver/wallet')} options={{ title: 'Wallet' }} />
      <DriverTabNav.Screen name="DriverProfileTab" component={makePlaceholder('Profile', '/driver/profile')} options={{ title: 'Profile' }} />
    </DriverTabNav.Navigator>
  );
}

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={t.colors.brandRed} size="large" />
    </View>
  );
}

export default function RootNavigator() {
  const { session, loading } = useAuth();
  const role = useRole();

  // The 800ms safety timeout in AuthProvider guarantees this is not permanent.
  if (loading) return <Splash />;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {session == null ? (
        <RootStack.Screen name="AuthStack" component={AuthStack} />
      ) : (
        <>
          {role === 'driver' ? (
            <RootStack.Screen name="DriverTabs" component={DriverTabs} />
          ) : (
            <RootStack.Screen name="RiderTabs" component={RiderTabs} />
          )}

          {/* Active-ride states: full-screen, no tab bar. */}
          <RootStack.Screen name="RideMatching" component={makePlaceholder('Matching', '/ride/:rideId/matching')} />
          <RootStack.Screen name="LiveTracking" component={makePlaceholder('Live tracking', '/track/:tripId')} />
          <RootStack.Screen name="DriverRideDetails" component={makePlaceholder('Ride details', '/driver/ride/:rideId')} />

          {/* Driver onboarding, pushed and gated. */}
          <RootStack.Screen name="DriverModeLanding" component={makePlaceholder('Driver mode', '/driver')} />
          <RootStack.Screen name="DriverRegistration" component={makePlaceholder('Driver registration', '/driver/register')} />
          <RootStack.Screen name="DriverApplication" component={makePlaceholder('Driver application', '/driver/application')} />

          <RootStack.Group screenOptions={{ presentation: 'modal' }}>
            <RootStack.Screen name="EditProfile" component={makePlaceholder('Edit profile', '/edit-profile')} />
            <RootStack.Screen name="DriverDeposit" component={makePlaceholder('Deposit', '/driver/deposit')} />
            <RootStack.Screen name="StudentVerification" component={makePlaceholder('Student verification', '/student-verification')} />
            <RootStack.Screen name="Safety" component={makePlaceholder('Safety', '/safety')} />
            <RootStack.Screen name="DeleteAccount" component={makePlaceholder('Delete account', '/delete-account')} />
          </RootStack.Group>
        </>
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.background,
  },
});
