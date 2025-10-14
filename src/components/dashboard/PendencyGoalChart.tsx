import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PendencyGoalChartProps {
  data: Array<{
    label: string;
    pendencies: number;
    total: number;
  }>;
}

export function PendencyGoalChart({ data }: PendencyGoalChartProps) {
  // Calculate goal (5% of total) and actual percentage for each period
  const chartData = data.map(item => ({
    period: item.label,
    meta: item.total > 0 ? (item.total * 0.05) : 0, // 5% do total
    real: item.pendencies,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meta de Pendências vs. Real</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparação entre meta (5% do total) e pendências reais
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="period" 
              className="text-xs"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis className="text-xs" />
            <Tooltip 
              formatter={(value: number) => value.toFixed(0)}
              labelFormatter={(label) => `Período: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="meta"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "hsl(var(--muted-foreground))", r: 4 }}
              name="Meta (5%)"
            />
            <Line
              type="monotone"
              dataKey="real"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              name="Real"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
