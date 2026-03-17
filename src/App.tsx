import { Suspense, lazy, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
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
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} duration={2000} />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"><img src="/icons/voyex-splash.png" alt="Voyex" className="w-56 h-56 object-contain" /></div>}>
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
      </Suspense>
    </BrowserRouter>
  );
}
