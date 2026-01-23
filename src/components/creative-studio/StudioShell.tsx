import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Home", href: "/creative-studio" },
  { label: "Brand Kit", href: "/creative-studio/brand-kit" },
  { label: "Fontes", href: "/creative-studio/sources" },
  { label: "Gerar", href: "/creative-studio/generate" },
  { label: "Revisão", href: "/creative-studio/review" },
  { label: "Calendário", href: "/creative-studio/calendar" },
];

export function StudioShell({ title, children }: { title: string; children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { userRole } = useRoleAccess(location.pathname);
  const { mainContainerClass } = useSidebarOffset();

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={user?.user_metadata?.full_name || "Usuário"} userRole={userRole} />

        <main className="p-4 md:p-6 lg:p-8 space-y-6">
          <header className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="text-muted-foreground mt-1">
                Creative Studio • Gerador de criativos para Instagram
              </p>
            </div>

            <nav className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <NavLink
                  key={t.href}
                  to={t.href}
                  className={({ isActive }) =>
                    cn(
                      "rounded-full border px-3 py-1.5 text-sm transition",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground hover:bg-muted"
                    )
                  }
                >
                  {t.label}
                </NavLink>
              ))}
            </nav>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
