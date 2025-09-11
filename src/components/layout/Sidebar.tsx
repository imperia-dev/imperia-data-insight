import { NavLink, useLocation } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import {
  LayoutDashboard,
  FileText,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userRole: string;
}

const navigation = [
  {
    title: "Dashboard Operação",
    icon: LayoutDashboard,
    href: "/",
    roles: ["owner", "master", "admin"],
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
    title: "Financeiro",
    icon: DollarSign,
    href: "/financial",
    roles: ["owner", "master"],
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
    title: "Produtividade",
    icon: TrendingUp,
    href: "/productivity",
    roles: ["owner", "master", "admin"],
  },
  {
    title: "Meus Pedidos",
    icon: Package,
    href: "/my-orders",
    roles: ["operation"],
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
  {
    title: "Dashboard Financeiro",
    icon: TrendingUp,
    href: "/dashboard-financeiro",
    roles: ["owner"],
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
];

export function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation();

  const filteredNavigation = navigation.filter((item) =>
    userRole ? item.roles.includes(userRole.toLowerCase()) : false
  );

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 z-40 border-r bg-white">
      {/* Logo Section */}
      <div className="flex h-16 items-center border-b px-6">
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-white shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
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
    </aside>
  );
}