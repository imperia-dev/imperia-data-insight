import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  onViewDetails?: () => void;
  hasDetails?: boolean;
}

export function StatsCard({
  title,
  value,
  change,
  icon,
  description,
  trend = "neutral",
  onViewDetails,
  hasDetails = false,
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-4 w-4" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (trend === "up") return "text-green-600";
    if (trend === "down") return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white relative">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {hasDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onViewDetails}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-3xl font-black text-foreground mt-2">{value}</p>
          
          {(change !== undefined || description) && (
            <div className="flex items-center gap-2 mt-3">
              {change !== undefined && change !== 0 && (
                <div className={cn("flex items-center gap-1", getTrendColor())}>
                  {getTrendIcon()}
                  <span className="text-sm font-medium">
                    {change > 0 ? "+" : ""}{change}%
                  </span>
                </div>
              )}
              {description && (
                <span className="text-sm text-muted-foreground whitespace-pre-line">
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
        
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-accent">
            <div className="text-primary">{icon}</div>
          </div>
        )}
      </div>
    </Card>
  );
}