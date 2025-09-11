import { cn } from "@/lib/utils";

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
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12'
  };

  const logoSrc = "/lovable-uploads/4f7e2079-bee6-4400-95b4-15a54ee77bc8.png";
  
  return (
    <div className={cn(
      "flex items-center",
      className
    )}>
      <img 
        src={logoSrc} 
        alt="Impéria Traduções Logo"
        className={cn(
          "object-contain",
          sizeClasses[size]
        )}
      />
    </div>
  );
}