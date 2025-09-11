import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PasswordReset from "./pages/PasswordReset";
import MasterDashboard from "./pages/MasterDashboard";
import Members from "./pages/Members";
import MembershipFees from "./pages/MembershipFees";
import Invoices from "./pages/Invoices";
import PublicDirectory from "./pages/PublicDirectory";
import PublicMap from "./pages/PublicMap";
import MemberMap from "./pages/MemberMap";
import RegistrationConfirmation from "./pages/RegistrationConfirmation";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";

import Dashboards from "./pages/Dashboards";
import ResearchDashboard from "./pages/ResearchDashboard";
import MemberAnalytics from "./pages/MemberAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Dynamically determine basename when the app is hosted under a subpath (e.g., /new/join-the-hess-consortium)
const baseName = (() => {
  try {
    const path = window.location.pathname || '';
    // Known external mount path for public registration
    const knownBase = '/new/join-the-hess-consortium';
    return path.startsWith(knownBase) ? knownBase : '/';
  } catch {
    return '/';
  }
})();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={baseName}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="/dashboard" element={<ProtectedRoute><MasterDashboard /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
            <Route path="/dashboards" element={<ProtectedRoute><Dashboards /></ProtectedRoute>} />
            <Route path="/research-dashboard" element={<ProtectedRoute><ResearchDashboard /></ProtectedRoute>} />
            <Route path="/member-analytics" element={<ProtectedRoute><MemberAnalytics /></ProtectedRoute>} />
            <Route path="/membership-fees" element={<ProtectedRoute><MembershipFees /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/public/directory" element={<PublicDirectory />} />
            <Route path="/public/map" element={<PublicMap />} />
            <Route path="/public-map" element={<ProtectedRoute><MemberMap /></ProtectedRoute>} />
            <Route path="/registration-confirmation" element={<RegistrationConfirmation />} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:profileId" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
