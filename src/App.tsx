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
import MasterDashboard from "./pages/MasterDashboard";
import Members from "./pages/Members";
import MembershipFees from "./pages/MembershipFees";
import Invoices from "./pages/Invoices";
import PublicDirectory from "./pages/PublicDirectory";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import OrganizationProfile from "./pages/OrganizationProfile";
import Dashboards from "./pages/Dashboards";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><MasterDashboard /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
            <Route path="/dashboards" element={<ProtectedRoute><Dashboards /></ProtectedRoute>} />
            <Route path="/membership-fees" element={<ProtectedRoute><MembershipFees /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/public/directory" element={<PublicDirectory />} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:profileId" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
            <Route path="/organization/:profileId" element={<ProtectedRoute><OrganizationProfile /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
