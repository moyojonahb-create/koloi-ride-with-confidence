import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
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
import PilotTest from "./pages/PilotTest";
import DriverWalletPage from "./pages/DriverWalletPage";
import DriverDepositPage from "./pages/DriverDepositPage";
import SafetyPage from "./pages/SafetyPage";
import DriverModeLanding from "./pages/DriverModeLanding";

// Admin pages
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
import RiderRequestScreen from "./pages/negotiate/RiderRequestScreen";
import RiderOffersScreen from "./pages/negotiate/RiderOffersScreen";
import DriverRequestsScreen from "./pages/negotiate/DriverRequestsScreen";

// Mapp (mobile app shell)
import MappLayout from "./components/mapp/MappLayout";
import MappRedirect from "./components/mapp/MappRedirect";
import MappAuthGuard from "./components/mapp/MappAuthGuard";
import MappDriverGuard from "./components/mapp/MappDriverGuard";
import MappAdminGuard from "./components/mapp/MappAdminGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* ── Existing web routes ── */}
              <Route path="/" element={<Index />} />
              <Route path="/ride" element={<Ride />} />
              <Route path="/ride/:rideId" element={<RiderRideDetail />} />
              <Route path="/ride-detail/:rideId" element={<RideDetail />} />
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<AppDashboard />} />
              <Route path="/profile" element={<RiderProfile />} />
              <Route path="/app" element={<AppDashboard />} />
              <Route path="/drive" element={<DriverApplication />} />
              <Route path="/driver-mode" element={<DriverModeLanding />} />
              <Route path="/safety" element={<SafetyPage />} />
              <Route path="/pilot-test" element={<PilotTest />} />
              <Route path="/drivers/wallet" element={<DriverWalletPage />} />
              <Route path="/drivers/deposit" element={<DriverDepositPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/drivers" element={<AdminDrivers />} />
              <Route path="/admin/drivers/map" element={<AdminDriversMap />} />
              <Route path="/admin/drivers/:driverId" element={<AdminDriverDetail />} />
              <Route path="/admin/trips" element={<AdminTrips />} />
              <Route path="/admin/landmarks" element={<AdminLandmarks />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/import-osm" element={<ImportOsmPlaces />} />
              <Route path="/admin/rate" element={<AdminRatePage />} />
              <Route path="/admin/deposits" element={<AdminDepositsPage />} />
              <Route path="/admin/ledger" element={<AdminLedger />} />

              {/* Negotiate / inDrive-style */}
              <Route path="/negotiate/request" element={<RiderRequestScreen />} />
              <Route path="/negotiate/offers/:requestId" element={<RiderOffersScreen />} />
              <Route path="/negotiate/driver" element={<DriverRequestsScreen />} />

              {/* ── /mapp – Mobile App Shell for Median.co ── */}
              <Route path="/mapp" element={<MappRedirect />} />
              <Route path="/mapp/login" element={<Auth />} />
              <Route path="/mapp/signup" element={<Signup />} />

              <Route element={<MappLayout />}>
                {/* Rider routes (auth required) */}
                <Route path="/mapp/ride" element={<MappAuthGuard><Ride /></MappAuthGuard>} />
                <Route path="/mapp/ride/:rideId" element={<MappAuthGuard><RiderRideDetail /></MappAuthGuard>} />
                <Route path="/mapp/negotiate/request" element={<MappAuthGuard><RiderRequestScreen /></MappAuthGuard>} />
                <Route path="/mapp/negotiate/offers/:requestId" element={<MappAuthGuard><RiderOffersScreen /></MappAuthGuard>} />

                {/* Driver routes */}
                <Route path="/mapp/driver" element={<MappAuthGuard><MappDriverGuard><DriverDashboard /></MappDriverGuard></MappAuthGuard>} />
                <Route path="/mapp/drivers/wallet" element={<MappAuthGuard><MappDriverGuard><DriverWalletPage /></MappDriverGuard></MappAuthGuard>} />
                <Route path="/mapp/drivers/deposit" element={<MappAuthGuard><MappDriverGuard><DriverDepositPage /></MappDriverGuard></MappAuthGuard>} />

                {/* New pages */}
                <Route path="/mapp/safety" element={<MappAuthGuard><SafetyPage /></MappAuthGuard>} />
                <Route path="/mapp/driver-mode" element={<DriverModeLanding />} />
                <Route path="/mapp/drive" element={<MappAuthGuard><DriverApplication /></MappAuthGuard>} />
                <Route path="/mapp/profile" element={<MappAuthGuard><RiderProfile /></MappAuthGuard>} />

                {/* Admin */}
                <Route path="/mapp/admin" element={<MappAuthGuard><MappAdminGuard><AdminDashboard /></MappAdminGuard></MappAuthGuard>} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
