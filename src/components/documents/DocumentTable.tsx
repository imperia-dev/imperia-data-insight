import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Document {
  id: string;
  title: string;
  client: string;
  translator: string;
  pages: number;
  deadline: string;
  status: "pending" | "in_progress" | "completed" | "review";
  priority: "low" | "medium" | "high";
  progress: number;
}

interface DocumentTableProps {
  documents: Document[];
}

const statusConfig = {
  pending: {
    label: "Pendente",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  in_progress: {
    label: "Em Progresso",
    color: "bg-blue-100 text-blue-800",
    icon: AlertCircle,
  },
  completed: {
    label: "Concluído",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  review: {
    label: "Revisão",
    color: "bg-purple-100 text-purple-800",
    icon: Eye,
  },
};

const priorityConfig = {
  low: { label: "Baixa", color: "bg-gray-100 text-gray-800" },
  medium: { label: "Média", color: "bg-orange-100 text-orange-800" },
  high: { label: "Alta", color: "bg-red-100 text-red-800" },
};

export function DocumentTable({ documents }: DocumentTableProps) {
  return (
    <Card className="border-0 shadow-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tradutor</TableHead>
            <TableHead className="text-center">Páginas</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead className="text-center">Progresso</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const StatusIcon = statusConfig[doc.status].icon;
            
            return (
              <TableRow key={doc.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{doc.title}</TableCell>
                <TableCell>{doc.client}</TableCell>
                <TableCell>{doc.translator}</TableCell>
                <TableCell className="text-center">{doc.pages}</TableCell>
                <TableCell>{doc.deadline}</TableCell>
                <TableCell>
                  <Badge className={`${statusConfig[doc.status].color} border-0 gap-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig[doc.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`${priorityConfig[doc.priority].color} border-0`}>
                    {priorityConfig[doc.priority].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-primary h-2 rounded-full transition-all"
                        style={{ width: `${doc.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{doc.progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}