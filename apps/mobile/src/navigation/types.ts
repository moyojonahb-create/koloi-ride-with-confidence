/**
 * Route names and params, mapped one-to-one from the web app's React Router
 * tree per §4 of MIGRATION_SCREEN_INVENTORY.md.
 *
 * Declaring the full shape now — including screens this increment renders as
 * placeholders — is what keeps the inventory's "nothing is silently dropped"
 * guarantee checkable by the compiler rather than by memory.
 *
 * The 21 redirect-only web routes (`/mapp/*`, `/negotiate/*`, `/login`,
 * `/ride-history`, `/driver-mode`) are deliberately absent: React Navigation
 * has no equivalent concept, and the few that matter become deep-link aliases
 * in `linking.ts` rather than screens.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

/** Unauthenticated. Selected by session state, not by a guard component. */
export type AuthStackParamList = {
  Auth: undefined;            // ← /auth
  Signup: undefined;          // ← /signup
  ResetPassword: undefined;   // ← /reset-password
};

export type RiderTabParamList = {
  RideTab: undefined;         // ← /ride     (home)
  HistoryTab: undefined;      // ← /history
  WalletTab: undefined;       // ← /wallet
  ProfileTab: undefined;      // ← /profile
};

export type DriverTabParamList = {
  DashboardTab: undefined;    // ← /driver/dashboard
  RequestsTab: undefined;     // ← /driver/requests
  TripsTab: undefined;        // ← /driver/trips
  DriverWalletTab: undefined; // ← /driver/wallet
  DriverProfileTab: undefined;// ← /driver/profile
};

export type RootStackParamList = {
  // Conditional branches — exactly one is mounted at a time.
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  RiderTabs: NavigatorScreenParams<RiderTabParamList>;
  DriverTabs: NavigatorScreenParams<DriverTabParamList>;

  // Full-screen pushes over the tabs. Active-ride states, where a tab bar is
  // wrong — see §4.
  RideMatching: { rideId: string };      // ← /ride/:rideId/matching
  LiveTracking: { tripId: string };      // ← /track/:tripId
  DriverRideDetails: { rideId: string }; // ← /driver/ride/:rideId

  // Modals.
  EditProfile: undefined;          // ← /edit-profile
  DriverDeposit: undefined;        // ← /driver/deposit
  StudentVerification: undefined;  // ← /student-verification
  Safety: undefined;               // ← /safety
  DeleteAccount: undefined;        // ← /delete-account

  // Driver onboarding, pushed and gated.
  DriverModeLanding: undefined;    // ← /driver
  DriverRegistration: undefined;   // ← /driver/register
  DriverApplication: undefined;    // ← /driver/application
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // Gives every useNavigation() call the root param list without importing it.
    interface RootParamList extends RootStackParamList {}
  }
}
