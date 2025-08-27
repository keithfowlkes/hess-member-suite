import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Members from "./pages/Members";
import MembershipFees from "./pages/MembershipFees";
import FormFields from "./pages/FormFields";
import Invoices from "./pages/Invoices";
import PublicViews from "./pages/PublicViews";
import PublicDirectory from "./pages/PublicDirectory";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import OrganizationProfile from "./pages/OrganizationProfile";
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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/members" element={<Members />} />
            <Route path="/membership-fees" element={<MembershipFees />} />
            <Route path="/form-fields" element={<FormFields />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/public-views" element={<PublicViews />} />
            <Route path="/public/directory" element={<PublicDirectory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:profileId" element={<ProfileEdit />} />
          <Route path="/organization/:profileId" element={<OrganizationProfile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
