import { AlertCircle, FileText, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface DemandLimitIndicatorProps {
  documentsToday: number;
  dailyLimit: number;
  currentOrderCount: number;
  maxConcurrentOrders: number;
  canTakeMoreOrders: boolean;
  dailyLimitReached: boolean;
  className?: string;
}

export function DemandLimitIndicator({
  documentsToday,
  dailyLimit,
  currentOrderCount,
  maxConcurrentOrders,
  canTakeMoreOrders,
  dailyLimitReached,
  className = "",
}: DemandLimitIndicatorProps) {
  const dailyPercentage = Math.min((documentsToday / dailyLimit) * 100, 100);
  const concurrentPercentage = (currentOrderCount / maxConcurrentOrders) * 100;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Limit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Documents Limit */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Documentos Hoje</span>
              </div>
              <span className={`text-sm font-bold ${dailyLimitReached ? 'text-destructive' : 'text-foreground'}`}>
                {documentsToday}/{dailyLimit}
              </span>
            </div>
            <Progress 
              value={dailyPercentage} 
              className={`h-2 ${dailyLimitReached ? '[&>div]:bg-destructive' : ''}`}
            />
          </CardContent>
        </Card>

        {/* Concurrent Orders Limit */}
        <Card className="border-l-4 border-l-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pedidos em Andamento</span>
              </div>
              <span className={`text-sm font-bold ${currentOrderCount >= maxConcurrentOrders ? 'text-destructive' : 'text-foreground'}`}>
                {currentOrderCount}/{maxConcurrentOrders}
              </span>
            </div>
            <Progress 
              value={concurrentPercentage} 
              className={`h-2 ${currentOrderCount >= maxConcurrentOrders ? '[&>div]:bg-destructive' : '[&>div]:bg-secondary'}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Warning Alerts */}
      {!canTakeMoreOrders && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {dailyLimitReached
              ? `Você atingiu o limite diário de ${dailyLimit} documentos. Aguarde o próximo dia para pegar mais pedidos.`
              : `Você atingiu o limite de ${maxConcurrentOrders} pedidos simultâneos. Finalize um pedido para pegar outro.`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
