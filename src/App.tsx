import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import AuthGuard from "./components/AuthGuard";
import AdminGuard from "./components/admin/AdminGuard";
import ErrorBoundary from "./components/ErrorBoundary";

// ─── Core pages — eagerly loaded for INSTANT navigation ───
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Ride from "./pages/Ride";
import RideDetail from "./pages/RideDetail";
import DriverDashboard from "./pages/DriverDashboard";
import RiderRideDetail from "./pages/RiderRideDetail";
import AppDashboard from "./pages/AppDashboard";

// ─── Lazy-loaded pages (secondary screens) ───
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
const DriverDepositPage = lazy(() => import("./pages/DriverDepositPage"));
const DriverLeaderboard = lazy(() => import("./pages/DriverLeaderboard"));
const DriverModeLanding = lazy(() => import("./pages/DriverModeLanding"));
const DriverRegistrationPage = lazy(() => import("./pages/DriverRegistrationPage"));
const DriverWalletPage = lazy(() => import("./pages/DriverWalletPage"));
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

// Negotiation screens
const DriverRequestsScreen = lazy(() => import("./pages/negotiate/DriverRequestsScreen"));
const RiderOffersScreen = lazy(() => import("./pages/negotiate/RiderOffersScreen"));
const RiderRequestScreen = lazy(() => import("./pages/negotiate/RiderRequestScreen"));

// Live tracking (public)
const LiveTrackingPage = lazy(() => import("./pages/LiveTrackingPage"));

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

// ─── Prefetch secondary pages during idle time ───
function prefetchSecondaryPages() {
  const pages = [
    () => import("./pages/RideHistory"),
    () => import("./pages/RiderProfile"),
    () => import("./pages/EditProfile"),
    () => import("./pages/RiderWalletPage"),
    () => import("./pages/DriverModeLanding"),
    () => import("./pages/DriverWalletPage"),
    () => import("./pages/DriverDepositPage"),
  ];
  // Stagger prefetch so we don't block the main thread
  pages.forEach((load, i) => {
    setTimeout(() => { load().catch(() => {}); }, 1500 + i * 300);
  });
}

export default function App() {
  const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

  useEffect(() => {
    (window as any).__dismissSplash?.();
    // Prefetch secondary pages after app mounts
    prefetchSecondaryPages();
  }, []);

  return (
    <Router>
      <ErrorBoundary>
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
          <Route path="/rider/ride/:rideId" element={<AuthGuard><RiderRideDetail /></AuthGuard>} />
          <Route path="/history" element={<SuspenseWrap><AuthGuard><RideHistory /></AuthGuard></SuspenseWrap>} />
          <Route path="/ride-history" element={<Navigate to="/history" replace />} />
          <Route path="/profile" element={<SuspenseWrap><AuthGuard><RiderProfile /></AuthGuard></SuspenseWrap>} />
          <Route path="/edit-profile" element={<SuspenseWrap><AuthGuard><EditProfile /></AuthGuard></SuspenseWrap>} />
          <Route path="/wallet" element={<SuspenseWrap><AuthGuard><RiderWalletPage /></AuthGuard></SuspenseWrap>} />

          <Route path="/driver" element={<SuspenseWrap><DriverModeLanding /></SuspenseWrap>} />
          <Route path="/driver-mode" element={<Navigate to="/driver" replace />} />
          <Route path="/driver/register" element={<SuspenseWrap><DriverRegistrationPage /></SuspenseWrap>} />
          <Route path="/driver/application" element={<SuspenseWrap><DriverApplication /></SuspenseWrap>} />
          <Route path="/driver/dashboard" element={<SuspenseWrap><AuthGuard><DriverDashboard /></AuthGuard></SuspenseWrap>} />
          <Route path="/driver/deposit" element={<SuspenseWrap><AuthGuard><DriverDepositPage /></AuthGuard></SuspenseWrap>} />
          <Route path="/driver/leaderboard" element={<SuspenseWrap><AuthGuard><DriverLeaderboard /></AuthGuard></SuspenseWrap>} />
          <Route path="/driver/wallet" element={<SuspenseWrap><AuthGuard><DriverWalletPage /></AuthGuard></SuspenseWrap>} />

          {/* Negotiation screens */}
          <Route path="/negotiate/request" element={<SuspenseWrap><AuthGuard><RiderRequestScreen /></AuthGuard></SuspenseWrap>} />
          <Route path="/negotiate/offers/:requestId" element={<SuspenseWrap><AuthGuard><RiderOffersScreen /></AuthGuard></SuspenseWrap>} />
          <Route path="/negotiate/driver-requests" element={<SuspenseWrap><AuthGuard><DriverRequestsScreen /></AuthGuard></SuspenseWrap>} />

          {/* Public live trip tracking */}
          <Route path="/track/:tripId" element={<SuspenseWrap><LiveTrackingPage /></SuspenseWrap>} />

          <Route path="/app" element={<SuspenseWrap><AuthGuard><AppDashboard /></AuthGuard></SuspenseWrap>} />

          <Route path="/safety" element={<SuspenseWrap><SafetyPage /></SuspenseWrap>} />
          <Route path="/terms" element={<SuspenseWrap><TermsOfService /></SuspenseWrap>} />
          <Route path="/privacy" element={<SuspenseWrap><PrivacyPolicy /></SuspenseWrap>} />
          <Route path="/offline" element={<SuspenseWrap><Offline /></SuspenseWrap>} />
          <Route path="/install" element={<SuspenseWrap><Install /></SuspenseWrap>} />
          <Route path="/delete-account" element={<SuspenseWrap><DeleteAccount /></SuspenseWrap>} />

          <Route path="/admin" element={<SuspenseWrap><AdminGuard><AdminDashboard /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/drivers" element={<SuspenseWrap><AdminGuard><AdminDrivers /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/drivers/:driverId" element={<SuspenseWrap><AdminGuard><AdminDriverDetail /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/drivers-map" element={<SuspenseWrap><AdminGuard><AdminDriversMap /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/landmarks" element={<SuspenseWrap><AdminGuard><AdminLandmarks /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/ledger" element={<SuspenseWrap><AdminGuard><AdminLedger /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/promos" element={<SuspenseWrap><AdminGuard><AdminPromos /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/rates" element={<SuspenseWrap><AdminGuard><AdminRatePage /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/reports" element={<SuspenseWrap><AdminGuard><AdminReports /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/trips" element={<SuspenseWrap><AdminGuard><AdminTrips /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/deposits" element={<SuspenseWrap><AdminGuard><AdminDepositsPage /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/rider-deposits" element={<SuspenseWrap><AdminGuard><AdminRiderDepositsPage /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/settings" element={<SuspenseWrap><AdminGuard><AdminSettings /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/town-pricing" element={<SuspenseWrap><AdminGuard><AdminTownPricing /></AdminGuard></SuspenseWrap>} />
          <Route path="/admin/import-places" element={<SuspenseWrap><AdminGuard><ImportOsmPlaces /></AdminGuard></SuspenseWrap>} />

          <Route path="*" element={<SuspenseWrap><NotFound /></SuspenseWrap>} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}
