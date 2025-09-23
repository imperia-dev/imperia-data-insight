import { NavLink, useLocation } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { useSidebar } from "@/contexts/SidebarContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Users,
  TrendingUp,
  DollarSign,
  Settings,
  Calendar,
  BarChart3,
  Clock,
  Sparkles,
  Package,
  CheckCircle,
  Wallet,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  ClipboardList,
  UserCheck,
  Send,
  Receipt,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  userRole: string;
}

const navigation = [
  {
    title: "Aprovação de Cadastros",
    icon: UserCheck,
    href: "/registration-approvals",
    roles: ["owner"],
    badge: true,
  },
  {
    title: "Dashboard Operação",
    icon: LayoutDashboard,
    href: "/dashboard-operacao",
    roles: ["owner", "master", "admin"],
  },
  {
    title: "Dashboard Financeiro",
    icon: TrendingUp,
    href: "/dashboard-financeiro",
    roles: ["owner"],
  },
  {
    title: "Fechamento Receitas",
    icon: FileText,
    href: "/fechamento",
    roles: ["owner"],
  },
  {
    title: "Fechamento Despesas",
    icon: FileSpreadsheet,
    href: "/fechamento-despesas",
    roles: ["owner"],
  },
  {
    title: "Solicitação de Pagamento",
    icon: Send,
    href: "/payment-request",
    roles: ["owner"],
  },
  {
    title: "Comprovantes de Pagamento",
    icon: Receipt,
    href: "/payment-receipts",
    roles: ["owner"],
  },
  {
    title: "Integração BTG",
    icon: Link,
    href: "/btg-integration",
    roles: ["owner", "master", "admin"],
  },
  {
    title: "Dashboard Comercial",
    icon: TrendingUp,
    href: "/dashboard-comercial",
    roles: ["owner"],
  },
  {
    title: "Dashboard Marketing",
    icon: TrendingUp,
    href: "/dashboard-marketing",
    roles: ["owner"],
  },
  {
    title: "Dashboard Tech",
    icon: TrendingUp,
    href: "/dashboard-tech",
    roles: ["owner"],
  },
  {
    title: "Pedidos",
    icon: FileText,
    href: "/orders",
    roles: ["owner", "master"],
  },
  {
    title: "Pedidos Entregues",
    icon: CheckCircle,
    href: "/delivered-orders",
    roles: ["owner", "operation", "admin", "master"],
  },
  {
    title: "Pendências",
    icon: AlertCircle,
    href: "/pendencies",
    roles: ["owner", "master", "admin"],
  },
  {
    title: "Produtividade",
    icon: TrendingUp,
    href: "/productivity",
    roles: ["owner", "master", "admin", "operation"],
  },
  {
    title: "Custos - Empresa",
    icon: DollarSign,
    href: "/company-costs",
    roles: ["owner"],
  },
  {
    title: "Custos - P. Serviço",
    icon: Users,
    href: "/service-provider-costs",
    roles: ["owner"],
  },
  {
    title: "Carteira",
    icon: Wallet,
    href: "/wallet",
    roles: ["owner", "master", "operation"],
  },
  {
    title: "Documentos",
    icon: FileText,
    href: "/documents",
    roles: ["owner", "master", "admin"],
  },
  {
    title: "Equipe",
    icon: Users,
    href: "/team",
    roles: ["owner", "master", "admin"],
  },
  {
    title: "Controle de Demanda",
    icon: ClipboardList,
    href: "/demand-control",
    roles: ["owner", "master"],
  },
  {
    title: "Meus Pedidos",
    icon: Package,
    href: "/my-orders",
    roles: ["owner", "operation"],
  },
  {
    title: "Relatórios",
    icon: BarChart3,
    href: "/reports",
    roles: ["owner", "master", "admin"],
  },
  {
    title: "Calendário",
    icon: Calendar,
    href: "/calendar",
    roles: ["owner", "master", "admin"],
  },
  {
    title: "Timesheet",
    icon: Clock,
    href: "/timesheet",
    roles: ["owner", "master", "admin"],
  },
  {
    title: "AI Analytics",
    icon: Sparkles,
    href: "/ai-analytics",
    roles: ["owner", "master"],
  },
  {
    title: "Configurações",
    icon: Settings,
    href: "/settings",
    roles: ["owner", "master", "admin"],
  },
];

export function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (userRole === 'owner') {
      const fetchPendingCount = async () => {
        const { count } = await supabase
          .from('registration_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingCount(count || 0);
      };
      fetchPendingCount();
    }
  }, [userRole]);

  const filteredNavigation = navigation.filter((item) =>
    userRole ? item.roles.includes(userRole.toLowerCase()) : false
  );

  return (
    <TooltipProvider>
      <aside className={cn(
        "hidden md:flex h-screen flex-col fixed left-0 top-0 z-40 border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Logo Section with Toggle Button */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!isCollapsed && <Logo size="md" />}
          <Button
            onClick={toggleSidebar}
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              isCollapsed && "mx-auto"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation with Scroll */}
        <ScrollArea className="flex-1">
          <nav className="space-y-1 px-2 py-4">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              const navLink = (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative",
                    isActive
                      ? "bg-primary text-white shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isCollapsed ? "h-5 w-5" : "")} />
                  {!isCollapsed && <span>{item.title}</span>}
                  {item.badge && item.href === '/registration-approvals' && pendingCount > 0 && (
                    <Badge className="ml-auto text-xs" variant="destructive">
                      {pendingCount}
                    </Badge>
                  )}
                </NavLink>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      {navLink}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return navLink;
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        {!isCollapsed && (
          <div className="border-t p-4">
            <div className="rounded-lg bg-gradient-accent p-4">
              <p className="text-xs font-medium text-primary">
                Descomplicando traduções,
              </p>
              <p className="text-xs font-medium text-primary">
                potencializando resultados
              </p>
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}