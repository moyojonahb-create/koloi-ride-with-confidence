import { useEffect } from "react";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import AuthGuard from "./components/AuthGuard";
import AdminGuard from "./components/admin/AdminGuard";

// Eagerly import all pages — no lazy loading, no blank screens
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import AppDashboard from "./pages/AppDashboard";
import Ride from "./pages/Ride";
import RideDetail from "./pages/RideDetail";
import RideHistory from "./pages/RideHistory";
import RiderProfile from "./pages/RiderProfile";
import EditProfile from "./pages/EditProfile";
import RiderWalletPage from "./pages/RiderWalletPage";
import SafetyPage from "./pages/SafetyPage";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Offline from "./pages/Offline";
import Install from "./pages/Install";
import DeleteAccount from "./pages/DeleteAccount";
import DriverApplication from "./pages/DriverApplication";
import DriverDashboard from "./pages/DriverDashboard";
import DriverDepositPage from "./pages/DriverDepositPage";
import DriverLeaderboard from "./pages/DriverLeaderboard";
import DriverModeLanding from "./pages/DriverModeLanding";
import DriverRegistrationPage from "./pages/DriverRegistrationPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminDriverDetail from "./pages/admin/AdminDriverDetail";
import AdminDriversMap from "./pages/admin/AdminDriversMap";
import AdminLandmarks from "./pages/admin/AdminLandmarks";
import AdminLedger from "./pages/admin/AdminLedger";
import AdminPromos from "./pages/admin/AdminPromos";
import AdminRatePage from "./pages/admin/AdminRatePage";
import AdminReports from "./pages/admin/AdminReports";
import AdminTrips from "./pages/admin/AdminTrips";
import AdminDepositsPage from "./pages/admin/AdminDepositsPage";
import AdminRiderDepositsPage from "./pages/admin/AdminRiderDepositsPage";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminTownPricing from "./pages/admin/AdminTownPricing";
import ImportOsmPlaces from "./pages/admin/ImportOsmPlaces";
import NotFound from "./pages/NotFound";

export default function App() {
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

  // Signal splash screen to dismiss once React is mounted
  useEffect(() => {
    (window as any).__dismissSplash?.();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/home" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/signup" element={<Signup />} />

        {/* Legacy / mapp compatibility redirects */}
        <Route path="/mapp" element={<Navigate to="/ride" replace />} />
        <Route path="/mapp/login" element={<Navigate to="/auth" replace />} />
        <Route path="/mapp/ride" element={<Navigate to="/ride" replace />} />
        <Route path="/mapp/history" element={<Navigate to="/history" replace />} />
        <Route path="/mapp/ride-history" element={<Navigate to="/history" replace />} />
        <Route path="/mapp/wallet" element={<Navigate to="/wallet" replace />} />
        <Route path="/mapp/profile" element={<Navigate to="/profile" replace />} />
        <Route path="/mapp/edit-profile" element={<Navigate to="/edit-profile" replace />} />
        <Route path="/mapp/driver" element={<Navigate to="/driver" replace />} />
        <Route path="/mapp/admin" element={<Navigate to="/admin" replace />} />
        <Route path="/mapp/safety" element={<Navigate to="/safety" replace />} />
        <Route path="/mapp/*" element={<Navigate to="/ride" replace />} />

        <Route path="/ride" element={<AuthGuard><Ride /></AuthGuard>} />
        <Route path="/ride/:rideId" element={<AuthGuard><RideDetail /></AuthGuard>} />
        <Route path="/history" element={<AuthGuard><RideHistory /></AuthGuard>} />
        <Route path="/ride-history" element={<Navigate to="/history" replace />} />
        <Route path="/profile" element={<AuthGuard><RiderProfile /></AuthGuard>} />
        <Route path="/edit-profile" element={<AuthGuard><EditProfile /></AuthGuard>} />
        <Route path="/wallet" element={<AuthGuard><RiderWalletPage /></AuthGuard>} />

        <Route path="/driver" element={<DriverModeLanding />} />
        <Route path="/driver-mode" element={<Navigate to="/driver" replace />} />
        <Route path="/driver/register" element={<DriverRegistrationPage />} />
        <Route path="/driver/application" element={<DriverApplication />} />
        <Route path="/driver/dashboard" element={<AuthGuard><DriverDashboard /></AuthGuard>} />
        <Route path="/driver/deposit" element={<AuthGuard><DriverDepositPage /></AuthGuard>} />
        <Route path="/driver/leaderboard" element={<AuthGuard><DriverLeaderboard /></AuthGuard>} />

        <Route path="/app" element={<AuthGuard><AppDashboard /></AuthGuard>} />

        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/offline" element={<Offline />} />
        <Route path="/install" element={<Install />} />
        <Route path="/delete-account" element={<DeleteAccount />} />

        <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/drivers" element={<AdminGuard><AdminDrivers /></AdminGuard>} />
        <Route path="/admin/drivers/:driverId" element={<AdminGuard><AdminDriverDetail /></AdminGuard>} />
        <Route path="/admin/drivers-map" element={<AdminGuard><AdminDriversMap /></AdminGuard>} />
        <Route path="/admin/landmarks" element={<AdminGuard><AdminLandmarks /></AdminGuard>} />
        <Route path="/admin/ledger" element={<AdminGuard><AdminLedger /></AdminGuard>} />
        <Route path="/admin/promos" element={<AdminGuard><AdminPromos /></AdminGuard>} />
        <Route path="/admin/rates" element={<AdminGuard><AdminRatePage /></AdminGuard>} />
        <Route path="/admin/reports" element={<AdminGuard><AdminReports /></AdminGuard>} />
        <Route path="/admin/trips" element={<AdminGuard><AdminTrips /></AdminGuard>} />
        <Route path="/admin/deposits" element={<AdminGuard><AdminDepositsPage /></AdminGuard>} />
        <Route path="/admin/rider-deposits" element={<AdminGuard><AdminRiderDepositsPage /></AdminGuard>} />
        <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />
        <Route path="/admin/town-pricing" element={<AdminGuard><AdminTownPricing /></AdminGuard>} />
        <Route path="/admin/import-places" element={<AdminGuard><ImportOsmPlaces /></AdminGuard>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
