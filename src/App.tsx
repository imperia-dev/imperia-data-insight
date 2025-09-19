import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedRouteWithApproval } from "./components/ProtectedRouteWithApproval";
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
import { DemandControl } from "./pages/DemandControl";
import Notifications from "./pages/Notifications";
import Fechamento from "./pages/Fechamento";
import RegistrationApprovals from "./pages/RegistrationApprovals";
import PendingApproval from "./pages/PendingApproval";

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
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/registration-approvals" element={
              <ProtectedRouteWithApproval>
                <RegistrationApprovals />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/" element={
              <ProtectedRouteWithApproval>
                <Dashboard />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/dashboard-operacao" element={
              <ProtectedRouteWithApproval>
                <Dashboard />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/orders" element={
              <ProtectedRouteWithApproval>
                <Orders />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/my-orders" element={
              <ProtectedRouteWithApproval>
                <MyOrders />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/delivered-orders" element={
              <ProtectedRouteWithApproval>
                <DeliveredOrders />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/documents" element={
              <ProtectedRouteWithApproval>
                <Documents />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/team" element={
              <ProtectedRouteWithApproval>
                <Team />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/productivity" element={
              <ProtectedRouteWithApproval>
                <Productivity />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/wallet" element={
              <ProtectedRouteWithApproval>
                <Wallet />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/reports" element={
              <ProtectedRouteWithApproval>
                <Reports />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/calendar" element={
              <ProtectedRouteWithApproval>
                <Calendar />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/timesheet" element={
              <ProtectedRouteWithApproval>
                <Timesheet />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/ai-analytics" element={
              <ProtectedRouteWithApproval>
                <AIAnalytics />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/settings" element={
              <ProtectedRouteWithApproval>
                <Settings />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/company-costs" element={
              <ProtectedRouteWithApproval>
                <CompanyCosts />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/service-provider-costs" element={
              <ProtectedRouteWithApproval>
                <ServiceProviderCosts />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/pendencies" element={
              <ProtectedRouteWithApproval>
                <Pendencies />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/dashboard-financeiro" element={
              <ProtectedRouteWithApproval>
                <DashboardFinanceiro />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/dashboard-comercial" element={
              <ProtectedRouteWithApproval>
                <DashboardComercial />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/dashboard-marketing" element={
              <ProtectedRouteWithApproval>
                <DashboardMarketing />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/dashboard-tech" element={
              <ProtectedRouteWithApproval>
                <DashboardTech />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/demand-control" element={
              <ProtectedRouteWithApproval>
                <DemandControl />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/notifications" element={
              <ProtectedRouteWithApproval>
                <Notifications />
              </ProtectedRouteWithApproval>
            } />
            <Route path="/fechamento" element={
              <ProtectedRouteWithApproval>
                <Fechamento />
              </ProtectedRouteWithApproval>
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
