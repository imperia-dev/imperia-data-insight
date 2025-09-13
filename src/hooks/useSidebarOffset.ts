import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

export function useSidebarOffset() {
  const { isCollapsed } = useSidebar();
  
  const sidebarOffsetClass = cn(
    "transition-all duration-300",
    isCollapsed ? "md:ml-16" : "md:ml-64"
  );
  
  const mainContainerClass = cn(
    "flex-1",
    sidebarOffsetClass
  );
  
  return {
    sidebarOffsetClass,
    mainContainerClass,
    isCollapsed
  };
}