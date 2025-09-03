import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  description?: string;
  onExport?: () => void;
  onFilter?: () => void;
}

export function ChartCard({
  title,
  children,
  description,
  onExport,
  onFilter,
}: ChartCardProps) {
  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onFilter}
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
          {onExport && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onExport}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
              <DropdownMenuItem>Compartilhar</DropdownMenuItem>
              <DropdownMenuItem>Configurar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}