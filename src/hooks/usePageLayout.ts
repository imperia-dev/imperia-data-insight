import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";

export function usePageLayout() {
  const { isCollapsed } = useSidebar();
  
  const mainContainerClass = cn(
    "transition-all duration-300",
    isCollapsed ? "md:pl-16" : "md:pl-64"
  );
  
  return { mainContainerClass };
}