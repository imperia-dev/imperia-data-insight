import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTrialCustomer } from "../TrialPortalGuard";
import {
  LayoutDashboard,
  FileText,
  Plus,
  Activity,
  DollarSign,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", url: "/portal/app", icon: LayoutDashboard, end: true },
  { title: "Pedidos", url: "/portal/app/pedidos", icon: FileText },
  { title: "Novo pedido", url: "/portal/app/novo", icon: Plus },
  { title: "Acompanhamento", url: "/portal/app/acompanhamento", icon: Activity },
  { title: "Financeiro", url: "/portal/app/financeiro", icon: DollarSign },
  { title: "Clientes", url: "/portal/app/clientes", icon: Users },
  { title: "Configurações", url: "/portal/app/configuracoes", icon: Settings },
];

export function PortalSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { customer } = useTrialCustomer();
  const navigate = useNavigate();

  const isActive = (url: string, end?: boolean) =>
    end ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const handleSignOut = async () => {
    await signOut();
    navigate("/portal/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className={cn("flex items-center gap-2 px-2 py-2", collapsed && "justify-center")}>
          {collapsed ? (
            <Logo size="sm" iconOnly />
          ) : (
            <>
              <Logo size="sm" />
              <span className="text-xs font-semibold text-muted-foreground tracking-wide truncate">
                Portal
              </span>
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isActive(item.url, item.end);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink to={item.url} end={item.end} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        {!collapsed && customer && (
          <div className="px-2 py-1 text-xs text-muted-foreground truncate">
            {customer.full_name}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn("justify-start gap-2", collapsed && "justify-center px-0")}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
