import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

export function PortalLayout({ children, showAuthActions = true }: { children: ReactNode; showAuthActions?: boolean }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-30">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/portal" className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-sm font-semibold tracking-wide text-muted-foreground hidden sm:inline">
              Portal do Cliente
            </span>
          </Link>
          {showAuthActions && (
            <div className="flex items-center gap-2">
              {user ? (
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/portal/login")}>
                    Entrar
                  </Button>
                  <Button size="sm" onClick={() => navigate("/portal/cadastro")}>
                    Criar conta
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t mt-12 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Impéria Traduções
      </footer>
    </div>
  );
}
