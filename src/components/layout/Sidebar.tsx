import { NavLink, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userRole: string;
}

const navigation = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    roles: ["master", "admin"],
  },
  {
    title: "Pedidos",
    icon: FileText,
    href: "/orders",
    roles: ["master"],
  },
    {
      title: "Meus Pedidos",
      icon: Package,
      href: "/my-orders",
      roles: ["operation"],
    },
    {
      title: "Pedidos Entregues",
      icon: CheckCircle,
      href: "/delivered-orders",
      roles: ["operation", "admin", "master"],
    },
  {
    title: "Documentos",
    icon: FileText,
    href: "/documents",
    roles: ["master", "admin"],
  },
  {
    title: "Equipe",
    icon: Users,
    href: "/team",
    roles: ["master", "admin", "operation"],
  },
  {
    title: "Produtividade",
    icon: TrendingUp,
    href: "/productivity",
    roles: ["master", "admin"],
  },
  {
    title: "Financeiro",
    icon: DollarSign,
    href: "/financial",
    roles: ["master"],
  },
  {
    title: "Relatórios",
    icon: BarChart3,
    href: "/reports",
    roles: ["master", "admin"],
  },
  {
    title: "Calendário",
    icon: Calendar,
    href: "/calendar",
    roles: ["master", "admin"],
  },
  {
    title: "Timesheet",
    icon: Clock,
    href: "/timesheet",
    roles: ["master", "admin"],
  },
  {
    title: "AI Analytics",
    icon: Sparkles,
    href: "/ai-analytics",
    roles: ["master"],
  },
  {
    title: "Configurações",
    icon: Settings,
    href: "/settings",
    roles: ["master", "admin"],
  },
];

export function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation();

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole.toLowerCase())
  );

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 z-40 border-r bg-white">
      {/* Logo Section */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="text-white font-black text-lg">i</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-primary leading-tight">impéria</span>
            <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider">traduções</span>
          </div>
        </div>
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