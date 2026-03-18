import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import AuthGuard from "./components/AuthGuard";
import AdminGuard from "./components/admin/AdminGuard";

// Lazy-loaded pages (code-split)
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Signup = lazy(() => import("./pages/Signup"));
const AppDashboard = lazy(() => import("./pages/AppDashboard"));
const Ride = lazy(() => import("./pages/Ride"));
const RideDetail = lazy(() => import("./pages/RideDetail"));
const RideHistory = lazy(() => import("./pages/RideHistory"));
const RiderProfile = lazy(() => import("./pages/RiderProfile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const RiderWalletPage = lazy(() => import("./pages/RiderWalletPage"));
const SafetyPage = lazy(() => import("./pages/SafetyPage"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Offline = lazy(() => import("./pages/Offline"));
const Install = lazy(() => import("./pages/Install"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const DriverApplication = lazy(() => import("./pages/DriverApplication"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const DriverDepositPage = lazy(() => import("./pages/DriverDepositPage"));
const DriverLeaderboard = lazy(() => import("./pages/DriverLeaderboard"));
const DriverModeLanding = lazy(() => import("./pages/DriverModeLanding"));
const DriverRegistrationPage = lazy(() => import("./pages/DriverRegistrationPage"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminDrivers = lazy(() => import("./pages/admin/AdminDrivers"));
const AdminDriverDetail = lazy(() => import("./pages/admin/AdminDriverDetail"));
const AdminDriversMap = lazy(() => import("./pages/admin/AdminDriversMap"));
const AdminLandmarks = lazy(() => import("./pages/admin/AdminLandmarks"));
const AdminLedger = lazy(() => import("./pages/admin/AdminLedger"));
const AdminPromos = lazy(() => import("./pages/admin/AdminPromos"));
const AdminRatePage = lazy(() => import("./pages/admin/AdminRatePage"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminTrips = lazy(() => import("./pages/admin/AdminTrips"));
const AdminDepositsPage = lazy(() => import("./pages/admin/AdminDepositsPage"));
const AdminRiderDepositsPage = lazy(() => import("./pages/admin/AdminRiderDepositsPage"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminTownPricing = lazy(() => import("./pages/admin/AdminTownPricing"));
const ImportOsmPlaces = lazy(() => import("./pages/admin/ImportOsmPlaces"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

  // Signal splash screen to dismiss once React is mounted
  useEffect(() => {
    (window as any).__dismissSplash?.();
  }, []);

  return (
    <Router>
      <Suspense fallback={null}>
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

          <Route path="/ride" element={
            <AuthGuard>
              <Ride />
            </AuthGuard>
          } />
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
          <Route path="/ride-history" element={<Navigate to="/history" replace />} />

          <Route
            path="/profile"
            element={
              <AuthGuard>
                <RiderProfile />
              </AuthGuard>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <AuthGuard>
                <EditProfile />
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

  <Route path="/driver" element={<DriverModeLanding />} />
  <Route path="/driver-mode" element={<Navigate to="/driver" replace />} />
  <Route path="/driver/register" element={<DriverRegistrationPage />} />
  <Route path="/driver/application" element={<DriverApplication />} />
  <Route
            path="/driver/dashboard"
            element={
              <AuthGuard>
                <DriverDashboard />
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
      </Suspense>
    </Router>
  );
}






