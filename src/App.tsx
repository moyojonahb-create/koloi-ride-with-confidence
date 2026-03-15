import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import AuthGuard from "./components/AuthGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import AppDashboard from "./pages/AppDashboard";
import Ride from "./pages/Ride";
import RideDetail from "./pages/RideDetail";
import RideHistory from "./pages/RideHistory";
import RiderProfile from "./pages/RiderProfile";
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
import AdminGuard from "./components/admin/AdminGuard";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} duration={2000} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/ride" replace />} />
        <Route path="/home" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/ride"
          element={
            <AuthGuard>
              <Ride />
            </AuthGuard>
          }
        />
        <Route
          path="/ride/:rideId"
          element={
            <AuthGuard>
              <RideDetail />
            </AuthGuard>
          }
        />
        <Route
          path="/history"
          element={
            <AuthGuard>
              <RideHistory />
            </AuthGuard>
          }
        />

        <Route
          path="/profile"
          element={
            <AuthGuard>
              <RiderProfile />
            </AuthGuard>
          }
        />
        <Route
          path="/wallet"
          element={
            <AuthGuard>
              <RiderWalletPage />
            </AuthGuard>
          }
        />

        <Route
          path="/driver"
          element={
            <AuthGuard>
              <DriverModeLanding />
            </AuthGuard>
          }
        />
        <Route
          path="/driver/dashboard"
          element={
            <AuthGuard>
              <DriverDashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/driver/application"
          element={
            <AuthGuard>
              <DriverApplication />
            </AuthGuard>
          }
        />
        <Route
          path="/driver/deposit"
          element={
            <AuthGuard>
              <DriverDepositPage />
            </AuthGuard>
          }
        />
        <Route
          path="/driver/leaderboard"
          element={
            <AuthGuard>
              <DriverLeaderboard />
            </AuthGuard>
          }
        />

        <Route
          path="/app"
          element={
            <AuthGuard>
              <AppDashboard />
            </AuthGuard>
          }
        />

        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/offline" element={<Offline />} />
        <Route path="/install" element={<Install />} />
        <Route path="/delete-account" element={<DeleteAccount />} />

        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminDashboard />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/drivers"
          element={
            <AdminGuard>
              <AdminDrivers />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/drivers/:driverId"
          element={
            <AdminGuard>
              <AdminDriverDetail />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/drivers-map"
          element={
            <AdminGuard>
              <AdminDriversMap />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/landmarks"
          element={
            <AdminGuard>
              <AdminLandmarks />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/ledger"
          element={
            <AdminGuard>
              <AdminLedger />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/promos"
          element={
            <AdminGuard>
              <AdminPromos />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/rates"
          element={
            <AdminGuard>
              <AdminRatePage />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminGuard>
              <AdminReports />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/trips"
          element={
            <AdminGuard>
              <AdminTrips />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/deposits"
          element={
            <AdminGuard>
              <AdminDepositsPage />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/rider-deposits"
          element={
            <AdminGuard>
              <AdminRiderDepositsPage />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminGuard>
              <AdminSettings />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/town-pricing"
          element={
            <AdminGuard>
              <AdminTownPricing />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/import-places"
          element={
            <AdminGuard>
              <ImportOsmPlaces />
            </AdminGuard>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
