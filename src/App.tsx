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
import PilotTest from "./pages/PilotTest";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminDriverDetail from "./pages/admin/AdminDriverDetail";
import AdminDriversMap from "./pages/admin/AdminDriversMap";
import AdminTrips from "./pages/admin/AdminTrips";
import AdminLandmarks from "./pages/admin/AdminLandmarks";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";

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
              <Route path="/" element={<Index />} />
              <Route path="/ride" element={<Ride />} />
              <Route path="/ride/:rideId" element={<RiderRideDetail />} />
              <Route path="/ride-detail/:rideId" element={<RideDetail />} />
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<AppDashboard />} />
              <Route path="/app" element={<AppDashboard />} />
              <Route path="/drive" element={<DriverApplication />} />
              <Route path="/pilot-test" element={<PilotTest />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/drivers" element={<AdminDrivers />} />
              <Route path="/admin/drivers/map" element={<AdminDriversMap />} />
              <Route path="/admin/drivers/:driverId" element={<AdminDriverDetail />} />
              <Route path="/admin/trips" element={<AdminTrips />} />
              <Route path="/admin/landmarks" element={<AdminLandmarks />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              
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


