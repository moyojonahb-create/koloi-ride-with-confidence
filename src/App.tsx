import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import AuthGuard from "@/components/AuthGuard";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import SplashScreen from "@/components/SplashScreen";
import GlobalRideNotifier from "@/components/GlobalRideNotifier";
import PageTransition from "@/components/PageTransition";
import Index from "./pages/Index";
import Ride from "./pages/Ride";
import RiderRideDetail from "./pages/RiderRideDetail";
import RideDetail from "./pages/RideDetail";
import DriverDashboard from "./pages/DriverDashboard";
import NotFound from "./pages/NotFound";
import DriverApplication from "./pages/DriverApplication";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import AppDashboard from "./pages/AppDashboard";
import RiderProfile from "./pages/RiderProfile";
import DriverWalletPage from "./pages/DriverWalletPage";
import DriverDepositPage from "./pages/DriverDepositPage";
import SafetyPage from "./pages/SafetyPage";
import DriverModeLanding from "./pages/DriverModeLanding";
import RideHistory from "./pages/RideHistory";
import EditProfile from "./pages/EditProfile";
import Install from "./pages/Install";
import Offline from "./pages/Offline";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import DeleteAccount from "./pages/DeleteAccount";
import { useOnlineStatus } from "./hooks/useOnlineStatus";

// Admin pages
import AdminGuard from "@/components/admin/AdminGuard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminDriverDetail from "./pages/admin/AdminDriverDetail";
import AdminDriversMap from "./pages/admin/AdminDriversMap";
import AdminTrips from "./pages/admin/AdminTrips";
import AdminLandmarks from "./pages/admin/AdminLandmarks";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import ImportOsmPlaces from "./pages/admin/ImportOsmPlaces";
import AdminRatePage from "./pages/admin/AdminRatePage";
import AdminDepositsPage from "./pages/admin/AdminDepositsPage";
import AdminLedger from "./pages/admin/AdminLedger";
import AdminTownPricing from "./pages/admin/AdminTownPricing";
import AdminRiderDepositsPage from "./pages/admin/AdminRiderDepositsPage";
import AdminPromos from "./pages/admin/AdminPromos";
import RiderWalletPage from "./pages/RiderWalletPage";
import RiderRequestScreen from "./pages/negotiate/RiderRequestScreen";
import RiderOffersScreen from "./pages/negotiate/RiderOffersScreen";
import DriverRequestsScreen from "./pages/negotiate/DriverRequestsScreen";

// Mapp (mobile app shell)
import MappLayout from "./components/mapp/MappLayout";
import MappRedirect from "./components/mapp/MappRedirect";
import MappAuthGuard from "./components/mapp/MappAuthGuard";
import MappDriverGuard from "./components/mapp/MappDriverGuard";
import MappAdminGuard from "./components/mapp/MappAdminGuard";
import DriverLeaderboard from "./pages/DriverLeaderboard";
import { I18nProvider } from "./lib/i18n";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <Routes location={location}>
        {/* ── Existing web routes ── */}
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/ride" element={<AuthGuard><PageTransition><Ride /></PageTransition></AuthGuard>} />
        <Route path="/ride/:rideId" element={<AuthGuard><PageTransition><RiderRideDetail /></PageTransition></AuthGuard>} />
        <Route path="/ride-detail/:rideId" element={<AuthGuard><PageTransition><RideDetail /></PageTransition></AuthGuard>} />
        <Route path="/driver" element={<AuthGuard><PageTransition><DriverDashboard /></PageTransition></AuthGuard>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/dashboard" element={<AuthGuard><PageTransition><AppDashboard /></PageTransition></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><PageTransition><RiderProfile /></PageTransition></AuthGuard>} />
        <Route path="/app" element={<AuthGuard><PageTransition><AppDashboard /></PageTransition></AuthGuard>} />
        <Route path="/drive" element={<AuthGuard><PageTransition><DriverApplication /></PageTransition></AuthGuard>} />
        <Route path="/driver-mode" element={<PageTransition><DriverModeLanding /></PageTransition>} />
        <Route path="/safety" element={<PageTransition><SafetyPage /></PageTransition>} />
        <Route path="/history" element={<AuthGuard><PageTransition><RideHistory /></PageTransition></AuthGuard>} />
        <Route path="/leaderboard" element={<AuthGuard><PageTransition><DriverLeaderboard /></PageTransition></AuthGuard>} />
        <Route path="/edit-profile" element={<AuthGuard><PageTransition><EditProfile /></PageTransition></AuthGuard>} />
        <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
        <Route path="/delete-account" element={<AuthGuard><PageTransition><DeleteAccount /></PageTransition></AuthGuard>} />
        <Route path="/drivers/wallet" element={<AuthGuard><PageTransition><DriverWalletPage /></PageTransition></AuthGuard>} />
        <Route path="/drivers/deposit" element={<AuthGuard><PageTransition><DriverDepositPage /></PageTransition></AuthGuard>} />
        <Route path="/wallet" element={<AuthGuard><PageTransition><RiderWalletPage /></PageTransition></AuthGuard>} />
        
        {/* Admin Routes - All protected by AdminGuard */}
        <Route path="/admin" element={<AdminGuard><PageTransition><AdminDashboard /></PageTransition></AdminGuard>} />
        <Route path="/admin/drivers" element={<AdminGuard><PageTransition><AdminDrivers /></PageTransition></AdminGuard>} />
        <Route path="/admin/drivers/map" element={<AdminGuard><PageTransition><AdminDriversMap /></PageTransition></AdminGuard>} />
        <Route path="/admin/drivers/:driverId" element={<AdminGuard><PageTransition><AdminDriverDetail /></PageTransition></AdminGuard>} />
        <Route path="/admin/trips" element={<AdminGuard><PageTransition><AdminTrips /></PageTransition></AdminGuard>} />
        <Route path="/admin/landmarks" element={<AdminGuard><PageTransition><AdminLandmarks /></PageTransition></AdminGuard>} />
        <Route path="/admin/reports" element={<AdminGuard><PageTransition><AdminReports /></PageTransition></AdminGuard>} />
        <Route path="/admin/settings" element={<AdminGuard><PageTransition><AdminSettings /></PageTransition></AdminGuard>} />
        <Route path="/admin/import-osm" element={<AdminGuard><PageTransition><ImportOsmPlaces /></PageTransition></AdminGuard>} />
        <Route path="/admin/rate" element={<AdminGuard><PageTransition><AdminRatePage /></PageTransition></AdminGuard>} />
        <Route path="/admin/deposits" element={<AdminGuard><PageTransition><AdminDepositsPage /></PageTransition></AdminGuard>} />
        <Route path="/admin/ledger" element={<AdminGuard><PageTransition><AdminLedger /></PageTransition></AdminGuard>} />
        <Route path="/admin/town-pricing" element={<AdminGuard><PageTransition><AdminTownPricing /></PageTransition></AdminGuard>} />
        <Route path="/admin/promos" element={<AdminGuard><PageTransition><AdminPromos /></PageTransition></AdminGuard>} />
        <Route path="/admin/rider-deposits" element={<AdminGuard><PageTransition><AdminRiderDepositsPage /></PageTransition></AdminGuard>} />

        {/* Negotiate / inDrive-style */}
        <Route path="/negotiate/request" element={<PageTransition><RiderRequestScreen /></PageTransition>} />
        <Route path="/negotiate/offers/:requestId" element={<PageTransition><RiderOffersScreen /></PageTransition>} />
        <Route path="/negotiate/driver" element={<PageTransition><DriverRequestsScreen /></PageTransition>} />

        {/* ── /mapp – Mobile App Shell for Median.co ── */}
        <Route path="/mapp" element={<MappRedirect />} />
        <Route path="/mapp/login" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/mapp/signup" element={<PageTransition><Signup /></PageTransition>} />

        <Route element={<MappLayout />}>
          {/* Rider routes (auth required) */}
          <Route path="/mapp/ride" element={<MappAuthGuard><PageTransition><Ride /></PageTransition></MappAuthGuard>} />
          <Route path="/mapp/ride/:rideId" element={<MappAuthGuard><PageTransition><RiderRideDetail /></PageTransition></MappAuthGuard>} />
          <Route path="/mapp/negotiate/request" element={<MappAuthGuard><PageTransition><RiderRequestScreen /></PageTransition></MappAuthGuard>} />
          <Route path="/mapp/negotiate/offers/:requestId" element={<MappAuthGuard><PageTransition><RiderOffersScreen /></PageTransition></MappAuthGuard>} />

          {/* Driver routes */}
          <Route path="/mapp/driver" element={<MappAuthGuard><MappDriverGuard><PageTransition><DriverDashboard /></PageTransition></MappDriverGuard></MappAuthGuard>} />
          <Route path="/mapp/drivers/wallet" element={<MappAuthGuard><MappDriverGuard><PageTransition><DriverWalletPage /></PageTransition></MappDriverGuard></MappAuthGuard>} />
          <Route path="/mapp/drivers/deposit" element={<MappAuthGuard><MappDriverGuard><PageTransition><DriverDepositPage /></PageTransition></MappDriverGuard></MappAuthGuard>} />

          {/* New pages */}
          <Route path="/mapp/safety" element={<MappAuthGuard><PageTransition><SafetyPage /></PageTransition></MappAuthGuard>} />
          <Route path="/mapp/driver-mode" element={<PageTransition><DriverModeLanding /></PageTransition>} />
          <Route path="/mapp/drive" element={<MappAuthGuard><PageTransition><DriverApplication /></PageTransition></MappAuthGuard>} />
          <Route path="/mapp/profile" element={<MappAuthGuard><PageTransition><RiderProfile /></PageTransition></MappAuthGuard>} />
          <Route path="/mapp/wallet" element={<MappAuthGuard><PageTransition><RiderWalletPage /></PageTransition></MappAuthGuard>} />
          <Route path="/mapp/ride-history" element={<MappAuthGuard><PageTransition><RideHistory /></PageTransition></MappAuthGuard>} />

          {/* Admin */}
          <Route path="/mapp/admin" element={<MappAuthGuard><MappAdminGuard><PageTransition><AdminDashboard /></PageTransition></MappAdminGuard></MappAuthGuard>} />
        </Route>
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashComplete = useCallback(() => setSplashDone(true), []);
  const isOnline = useOnlineStatus();

  return (
  <I18nProvider>
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="voyex-theme">
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ErrorBoundary>
          {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
          {splashDone && !isOnline && <Offline />}
          <GlobalRideNotifier />
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AnimatedRoutes />
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ThemeProvider>
  </I18nProvider>
  );
};

export default App;
