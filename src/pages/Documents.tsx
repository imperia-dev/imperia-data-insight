import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Filter, Search, Upload, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const mockDocuments = [
  {
    id: "1",
    title: "Contrato Internacional XYZ",
    client: "Tech Corp Brasil",
    translator: "Ana Silva",
    pages: 45,
    deadline: "15/12/2024",
    status: "in_progress" as const,
    priority: "high" as const,
    progress: 65,
  },
  {
    id: "2",
    title: "Manual Técnico ABC",
    client: "Indústria Global",
    translator: "Carlos Oliveira",
    pages: 120,
    deadline: "20/12/2024",
    status: "pending" as const,
    priority: "medium" as const,
    progress: 0,
  },
  {
    id: "3",
    title: "Relatório Médico 2024",
    client: "Hospital Central",
    translator: "Maria Santos",
    pages: 30,
    deadline: "10/12/2024",
    status: "completed" as const,
    priority: "low" as const,
    progress: 100,
  },
  {
    id: "4",
    title: "Documento Financeiro Q4",
    client: "Banco Internacional",
    translator: "João Costa",
    pages: 85,
    deadline: "18/12/2024",
    status: "review" as const,
    priority: "high" as const,
    progress: 90,
  },
  {
    id: "5",
    title: "Apresentação Corporativa",
    client: "Startup Tech",
    translator: "Beatriz Lima",
    pages: 25,
    deadline: "12/12/2024",
    status: "in_progress" as const,
    priority: "medium" as const,
    progress: 45,
  },
];

export default function Documents() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
          setUserRole(data.role);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-foreground">
                  Gestão de Documentos
                </h1>
                <p className="text-muted-foreground mt-1">
                  Acompanhe e gerencie todos os documentos em tradução
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button className="bg-gradient-primary hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Documento
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, cliente ou tradutor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="review">Em Revisão</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Prioridades</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Mais Filtros
              </Button>
            </div>
          </div>

          {/* Documents Table */}
          <DocumentTable documents={mockDocuments} />
        </main>
      </div>
    </div>
  );
}