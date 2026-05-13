import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { PortalSidebar } from "./components/PortalSidebar";
import { TrialPortalGuard } from "./TrialPortalGuard";

export function PortalAppLayout({ children }: { children?: ReactNode }) {
  return (
    <TrialPortalGuard>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-muted/20">
          <PortalSidebar />
          <SidebarInset className="flex-1">
            <header className="h-14 flex items-center gap-3 border-b bg-background/80 backdrop-blur px-4 sticky top-0 z-20">
              <SidebarTrigger />
              <span className="text-sm font-medium text-muted-foreground">Portal do Cliente</span>
            </header>
            <main className="p-4 md:p-6 lg:p-8">{children ?? <Outlet />}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TrialPortalGuard>
  );
}
