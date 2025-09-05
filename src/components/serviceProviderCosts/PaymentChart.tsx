import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useMemo } from "react";

interface PaymentChartProps {
  costs: Array<{
    name: string;
    amount: number;
    status: string;
  }>;
}

export function PaymentChart({ costs }: PaymentChartProps) {
  const chartData = useMemo(() => {
    // Group costs by person name and calculate totals
    const personTotals = costs.reduce((acc, cost) => {
      if (!acc[cost.name]) {
        acc[cost.name] = {
          name: cost.name,
          paid: 0,
          pending: 0,
          notPaid: 0,
          total: 0,
        };
      }
      
      const amount = cost.amount;
      acc[cost.name].total += amount;
      
      if (cost.status === 'Pago') {
        acc[cost.name].paid += amount;
      } else if (cost.status === 'Pendente') {
        acc[cost.name].pending += amount;
      } else {
        acc[cost.name].notPaid += amount;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(personTotals)
      .map((person: any) => ({
        ...person,
        formattedTotal: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(person.total),
        formattedPaid: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(person.paid),
        formattedPending: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(person.pending),
        formattedNotPaid: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(person.notPaid),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Show top 10 providers
  }, [costs]);

  const chartConfig = {
    paid: {
      label: "Pago",
      color: "hsl(142 76% 36%)",
    },
    pending: {
      label: "Pendente",
      color: "hsl(48 96% 53%)",
    },
    notPaid: {
      label: "Não Pago",
      color: "hsl(0 84% 60%)",
    },
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{data.formattedTotal}</span>
            </div>
            {data.paid > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-green-600">Pago:</span>
                <span className="font-medium">{data.formattedPaid}</span>
              </div>
            )}
            {data.pending > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-yellow-600">Pendente:</span>
                <span className="font-medium">{data.formattedPending}</span>
              </div>
            )}
            {data.notPaid > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-red-600">Não Pago:</span>
                <span className="font-medium">{data.formattedNotPaid}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 mt-8">
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          Pagamentos por Prestador de Serviço
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualização dos {chartData.length} principais prestadores por valor total
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 40, bottom: 120 }}
            >
              <defs>
                <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(48 96% 53%)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(48 96% 53%)" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="notPaidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={120}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                stroke="hsl(var(--border))"
                interval={0}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                stroke="hsl(var(--border))"
                tickFormatter={(value) =>
                  new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Bar
                dataKey="paid"
                stackId="a"
                fill="url(#paidGradient)"
                radius={[0, 0, 0, 0]}
                animationDuration={1000}
              />
              <Bar
                dataKey="pending"
                stackId="a"
                fill="url(#pendingGradient)"
                radius={[0, 0, 0, 0]}
                animationDuration={1000}
              />
              <Bar
                dataKey="notPaid"
                stackId="a"
                fill="url(#notPaidGradient)"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}