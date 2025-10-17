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
  TrendingDown,
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
  ChevronDown,
  ChevronUp,
  Home,
  ClipboardList,
  UserCheck,
  Send,
  Receipt,
  Link,
  Activity,
  Briefcase,
  Calculator,
  ShoppingCart,
  Megaphone,
  Code,
  Shield,
  FileBarChart,
  UserPlus,
  MessageSquare,
  Image,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  userRole: string;
}

interface NavigationItem {
  title: string;
  icon: any;
  href: string;
  roles: string[];
  badge?: boolean;
}

interface NavigationGroup {
  title: string;
  icon: any;
  items: NavigationItem[];
  roles: string[];
}

const navigationGroups: NavigationGroup[] = [
  {
    title: "Financeiro",
    icon: DollarSign,
    roles: ["owner", "master", "admin"],
    items: [
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
        title: "Fechamento Prestadores",
        icon: Users,
        href: "/fechamento-prestadores",
        roles: ["owner"],
      },
      {
        title: "Aprovações Master",
        icon: UserCheck,
        href: "/master-protocol-approvals",
        roles: ["master"],
      },
      {
        title: "Aprovação Final Owner",
        icon: CheckCircle,
        href: "/owner-final-approval",
        roles: ["owner"],
      },
      {
        title: "Processamento de Pagamentos",
        icon: DollarSign,
        href: "/payment-processing",
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
        roles: ["owner"],
      },
    ],
  },
  {
    title: "Operação",
    icon: Activity,
    roles: ["owner", "master", "admin", "operation", "translator"],
    items: [
      {
        title: "Dashboard Operação",
        icon: LayoutDashboard,
        href: "/dashboard-operacao",
        roles: ["owner", "master", "admin"],
      },
      {
        title: "Meus Pedidos",
        icon: Package,
        href: "/my-orders",
        roles: ["owner", "master", "operation", "translator"],
      },
      {
        title: "Pedidos",
        icon: FileText,
        href: "/orders",
        roles: ["owner", "master", "admin", "operation"],
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
        title: "KPIs dos Colaboradores",
        icon: BarChart3,
        href: "/collaborators-kpi",
        roles: ["owner"],
      },
      {
        title: "Controle de Demanda",
        icon: ClipboardList,
        href: "/demand-control",
        roles: ["owner", "master"],
      },
      {
        title: "Translation Orders",
        icon: FileText,
        href: "/translation-orders",
        roles: ["owner", "admin"],
      },
    ],
  },
  {
    title: "Custos",
    icon: Calculator,
    roles: ["owner"],
    items: [
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
    ],
  },
  {
    title: "Dashboards",
    icon: BarChart3,
    roles: ["owner"],
    items: [
      {
        title: "Dashboard Comercial",
        icon: ShoppingCart,
        href: "/dashboard-comercial",
        roles: ["owner"],
      },
      {
        title: "Dashboard Marketing",
        icon: Megaphone,
        href: "/dashboard-marketing",
        roles: ["owner"],
      },
      {
        title: "Dashboard Tech",
        icon: Code,
        href: "/dashboard-tech",
        roles: ["owner"],
      },
    ],
  },
  {
    title: "Integração",
    icon: Link,
    roles: ["owner"],
    items: [
      {
        title: "Leads",
        icon: UserPlus,
        href: "/leads",
        roles: ["owner"],
      },
    ],
  },
  {
    title: "Administração",
    icon: Briefcase,
    roles: ["owner", "master", "admin", "operation", "translator"],
    items: [
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
        roles: ["owner"],
      },
      {
        title: "Carteira",
        icon: Wallet,
        href: "/wallet",
        roles: ["owner", "master", "operation", "translator"],
      },
      {
        title: "Meus Protocolos",
        icon: ClipboardList,
        href: "/operation-protocol-data",
        roles: ["operation", "translator"],
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
        title: "Assets da Empresa",
        icon: Image,
        href: "/company-assets",
        roles: ["owner"],
      },
    ],
  },
  {
    title: "Relatórios & Analytics",
    icon: FileBarChart,
    roles: ["owner"],
    items: [
      {
        title: "Relatórios",
        icon: BarChart3,
        href: "/reports",
        roles: ["owner"],
      },
      {
        title: "AI Analytics",
        icon: Sparkles,
        href: "/ai-analytics",
        roles: ["owner"],
      },
    ],
  },
];

// Itens que ficam fora dos grupos (sempre visíveis)
const standaloneItems: NavigationItem[] = [
  {
    title: "Chat",
    icon: MessageSquare,
    href: "/chat",
    roles: ["owner", "master", "admin", "operation"],
  },
  {
    title: "Segurança",
    icon: Shield,
    href: "/security-dashboard",
    roles: ["owner"],
  },
  {
    title: "Aprovação de Cadastros",
    icon: UserCheck,
    href: "/registration-approvals",
    roles: ["owner"],
    badge: true,
  },
  {
    title: "Configurações",
    icon: Settings,
    href: "/settings",
    roles: ["owner", "master", "admin", "operation", "translator", "customer"],
  },
];

// Customer-specific navigation
const customerNavigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/customer-dashboard",
    roles: ["customer"],
  },
  {
    title: "Nova Solicitação",
    icon: Send,
    href: "/customer-pendency-request",
    roles: ["customer"],
  },
  {
    title: "Minhas Solicitações",
    icon: ClipboardList,
    href: "/customer-requests",
    roles: ["customer"],
  },
  {
    title: "Configurações",
    icon: Settings,
    href: "/settings",
    roles: ["customer"],
  },
];

// Financeiro-specific navigation
const financeiroNavigationItems: NavigationItem[] = [
  {
    title: "Contas a Pagar",
    icon: TrendingDown,
    href: "/contas-a-pagar",
    roles: ["financeiro"],
  },
  {
    title: "Contas a Receber",
    icon: TrendingUp,
    href: "/contas-a-receber",
    roles: ["financeiro"],
  },
];

export function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [pendingCount, setPendingCount] = useState(0);
  
  // Initialize with the group containing the current route
  const getInitialOpenGroups = () => {
    const currentPath = location.pathname;
    const activeGroups = navigationGroups
      .filter(group => 
        group.items.some(item => item.href === currentPath)
      )
      .map(group => group.title);
    return activeGroups;
  };
  
  const [openGroups, setOpenGroups] = useState<string[]>(getInitialOpenGroups);

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

  // Auto-expand group if current route is inside it
  useEffect(() => {
    const currentPath = location.pathname;
    const activeGroups = navigationGroups
      .filter(group => 
        group.items.some(item => item.href === currentPath)
      )
      .map(group => group.title);
    
    if (activeGroups.length > 0) {
      setOpenGroups(prev => {
        // Merge with existing open groups to maintain user's manual expansions
        const merged = [...new Set([...prev, ...activeGroups])];
        return merged;
      });
    }
  }, [location.pathname]);

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev =>
      prev.includes(groupTitle)
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  const filteredGroups = navigationGroups
    .filter(group => 
      userRole ? group.roles.includes(userRole.toLowerCase()) : false
    )
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        userRole ? item.roles.includes(userRole.toLowerCase()) : false
      )
    }))
    .filter(group => group.items.length > 0);

  const filteredStandaloneItems = standaloneItems.filter((item) =>
    userRole ? item.roles.includes(userRole.toLowerCase()) : false
  );

  // Filter customer navigation if role is customer
  const filteredCustomerItems = userRole === 'customer' 
    ? customerNavigationItems.filter(item => item.roles.includes('customer'))
    : [];

  // Filter financeiro navigation if role is financeiro
  const filteredFinanceiroItems = userRole === 'financeiro' 
    ? financeiroNavigationItems.filter(item => item.roles.includes('financeiro'))
    : [];

  const renderNavItem = (item: NavigationItem, isNested: boolean = false) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    const navLink = (
      <NavLink
        key={item.href}
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all relative",
          isActive
            ? "bg-primary text-white shadow-md"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          isCollapsed && "justify-center px-2",
          isNested && !isCollapsed && "ml-6"
        )}
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0", isCollapsed ? "h-5 w-5" : "")} />
        {!isCollapsed && <span className="truncate">{item.title}</span>}
        {item.badge && item.href === '/registration-approvals' && pendingCount > 0 && !isCollapsed && (
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
            {item.badge && item.href === '/registration-approvals' && pendingCount > 0 && (
              <span className="ml-2 text-destructive">({pendingCount})</span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return navLink;
  };

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
          <nav className="px-2 py-4">
            {/* Customer Navigation (if customer role) */}
            {userRole === 'customer' ? (
              <div className="space-y-1">
                {filteredCustomerItems.map(item => renderNavItem(item))}
              </div>
            ) : userRole === 'financeiro' ? (
              /* Financeiro Navigation (if financeiro role) */
              <div className="space-y-1">
                {filteredFinanceiroItems.map(item => renderNavItem(item))}
              </div>
            ) : (
              <>
                {/* Standalone items first (Aprovação de Cadastros) */}
                {filteredStandaloneItems
                  .filter(item => item.href === '/registration-approvals')
                  .map(item => (
                    <div key={item.href} className="mb-4">
                      {renderNavItem(item)}
                    </div>
                  ))}

                {/* Navigation Groups */}
                <div className="space-y-4">
                  {filteredGroups.map((group) => {
                const isOpen = openGroups.includes(group.title);
                const GroupIcon = group.icon;
                const hasActiveItem = group.items.some(item => location.pathname === item.href);

                if (isCollapsed) {
                  // In collapsed mode, show items directly without grouping
                  return (
                    <div key={group.title} className="space-y-1">
                      {group.items.map(item => renderNavItem(item))}
                    </div>
                  );
                }

                return (
                  <Collapsible
                    key={group.title}
                    open={isOpen}
                    onOpenChange={() => toggleGroup(group.title)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-between px-3 py-2 text-sm font-medium",
                          hasActiveItem && "text-primary"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <GroupIcon className="h-4 w-4" />
                          <span>{group.title}</span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      {group.items.map(item => renderNavItem(item, true))}
                    </CollapsibleContent>
                  </Collapsible>
                );
                  })}
                </div>

                {/* Other standalone items (Configurações) */}
                <div className="mt-4 pt-4 border-t">
                  {filteredStandaloneItems
                    .filter(item => item.href !== '/registration-approvals')
                    .map(item => renderNavItem(item))}
                </div>
              </>
            )}
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
