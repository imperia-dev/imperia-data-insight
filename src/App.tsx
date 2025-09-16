import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";

import Wallet from "./pages/Wallet";
import Calendar from "./pages/Calendar";
import { Orders } from "./pages/Orders";
import { MyOrders } from "./pages/MyOrders";
import { DeliveredOrders } from "./pages/DeliveredOrders";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import CompanyCosts from "./pages/CompanyCosts";
import ServiceProviderCosts from "./pages/ServiceProviderCosts";
import Pendencies from "./pages/Pendencies";
import Productivity from "./pages/Productivity";
import DashboardFinanceiro from "./pages/DashboardFinanceiro";
import DashboardComercial from "./pages/DashboardComercial";
import DashboardMarketing from "./pages/DashboardMarketing";
import DashboardTech from "./pages/DashboardTech";
import Team from "./pages/Team";
import Reports from "./pages/Reports";
import Timesheet from "./pages/Timesheet";
import AIAnalytics from "./pages/AIAnalytics";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SidebarProvider>
            <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DeliveredOrders />
              </ProtectedRoute>
            } />
            <Route path="/dashboard-operacao" element={
              <ProtectedRoute>
                <DeliveredOrders />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } />
            <Route path="/my-orders" element={
              <ProtectedRoute>
                <MyOrders />
              </ProtectedRoute>
            } />
            <Route path="/delivered-orders" element={
              <ProtectedRoute>
                <DeliveredOrders />
              </ProtectedRoute>
            } />
            <Route path="/documents" element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            } />
            <Route path="/team" element={
              <ProtectedRoute>
                <Team />
              </ProtectedRoute>
            } />
            <Route path="/productivity" element={
              <ProtectedRoute>
                <Productivity />
              </ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute>
                <Wallet />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            } />
            <Route path="/timesheet" element={
              <ProtectedRoute>
                <Timesheet />
              </ProtectedRoute>
            } />
            <Route path="/ai-analytics" element={
              <ProtectedRoute>
                <AIAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/company-costs" element={
              <ProtectedRoute>
                <CompanyCosts />
              </ProtectedRoute>
            } />
            <Route path="/service-provider-costs" element={
              <ProtectedRoute>
                <ServiceProviderCosts />
              </ProtectedRoute>
            } />
            <Route path="/pendencies" element={
              <ProtectedRoute>
                <Pendencies />
              </ProtectedRoute>
            } />
            <Route path="/dashboard-financeiro" element={
              <ProtectedRoute>
                <DashboardFinanceiro />
              </ProtectedRoute>
            } />
            <Route path="/dashboard-comercial" element={
              <ProtectedRoute>
                <DashboardComercial />
              </ProtectedRoute>
            } />
            <Route path="/dashboard-marketing" element={
              <ProtectedRoute>
                <DashboardMarketing />
              </ProtectedRoute>
            } />
            <Route path="/dashboard-tech" element={
              <ProtectedRoute>
                <DashboardTech />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
