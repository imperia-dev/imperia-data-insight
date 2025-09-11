import { cn } from "@/lib/utils";
import { MessageSquareMore } from "lucide-react";

interface LogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export function Logo({ 
  variant = 'horizontal', 
  size = 'md', 
  className,
  showText = true 
}: LogoProps) {
  const sizeClasses = {
    sm: {
      icon: 'h-5 w-5',
      text: 'text-lg',
      gap: 'gap-1.5'
    },
    md: {
      icon: 'h-6 w-6',
      text: 'text-xl',
      gap: 'gap-2'
    },
    lg: {
      icon: 'h-8 w-8',
      text: 'text-2xl',
      gap: 'gap-2.5'
    }
  };

  const currentSize = sizeClasses[size];
  const isVertical = variant === 'vertical';
  const isIconOnly = variant === 'icon-only' || !showText;

  // Uncomment and update when you have your logo image:
  // const logoSrc = "/src/assets/logo.png"; // or "/src/assets/logo.svg"
  
  // For image-based logo (uncomment when ready):
  /*
  if (logoSrc) {
    return (
      <div className={cn(
        "flex items-center",
        isVertical ? "flex-col" : "flex-row",
        currentSize.gap,
        className
      )}>
        <img 
          src={logoSrc} 
          alt="Impéria Logo"
          className={cn(
            "object-contain",
            size === 'sm' ? 'h-8' : size === 'md' ? 'h-10' : 'h-12'
          )}
        />
        {!isIconOnly && (
          <span className={cn(
            "font-outfit font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent",
            currentSize.text
          )}>
            Analytics
          </span>
        )}
      </div>
    );
  }
  */

  // Current icon-based logo (fallback or temporary)
  return (
    <div className={cn(
      "flex items-center",
      isVertical ? "flex-col" : "flex-row",
      currentSize.gap,
      className
    )}>
      <div className="relative">
        <MessageSquareMore className={cn(
          "text-primary",
          currentSize.icon
        )} />
        <div className="absolute -inset-1 bg-primary/20 blur-xl rounded-full -z-10" />
      </div>
      
      {!isIconOnly && (
        <div className={cn(
          "flex items-baseline",
          isVertical && "flex-col items-center"
        )}>
          <span className={cn(
            "font-outfit font-black bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent",
            currentSize.text
          )}>
            impéria
          </span>
          <span className={cn(
            "font-outfit font-light text-muted-foreground ml-1",
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
          )}>
            Analytics
          </span>
        </div>
      )}
    </div>
  );
}