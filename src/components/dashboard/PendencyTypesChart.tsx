import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PendencyTypesChartProps {
  data: Array<{
    type: string;
    count: number;
  }>;
}

export function PendencyTypesChart({ data }: PendencyTypesChartProps) {
  const [showAllDialog, setShowAllDialog] = useState(false);
  
  // Sort data by count and get top 5
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const top5Data = sortedData.slice(0, 5);
  const hasMore = sortedData.length > 5;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tipos de Pendência</CardTitle>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllDialog(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver detalhes
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top5Data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="type" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
          {hasMore && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Mostrando top 5 de {sortedData.length} tipos
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Todos os Tipos de Pendência</DialogTitle>
            <DialogDescription>
              Lista completa de tipos de pendência e suas quantidades
            </DialogDescription>
          </DialogHeader>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Tipo de Pendência</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell className="text-right font-bold">{item.count}</TableCell>
                </TableRow>
              ))}
              {sortedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma pendência encontrada no período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total de tipos:</span>
              <span className="font-bold">{sortedData.length}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">Total de pendências:</span>
              <span className="font-bold">{sortedData.reduce((sum, item) => sum + item.count, 0)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}