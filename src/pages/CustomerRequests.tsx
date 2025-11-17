import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCustomerContext } from "@/hooks/useCustomerContext";
import { RequestStatusBadge } from "@/components/customer/RequestStatusBadge";
import { PriorityBadge } from "@/components/customer/PriorityBadge";
import { RequestTimeline } from "@/components/customer/RequestTimeline";
import { Plus, Search, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type Request = {
  id: string;
  order_id: string;
  description: string;
  priority: 'baixa' | 'normal' | 'alta' | 'urgente';
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'converted';
  created_at: string;
  attachments: any;
  internal_notes: string | null;
  rejection_reason: string | null;
};

export default function CustomerRequests() {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const { customerName } = useCustomerContext();
  const { userRole, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userName, setUserName] = useState("");
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['customer-pendency-requests', session?.user?.id, customerName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_pendency_requests')
        .select('*')
        .eq('customer_name', customerName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Request[];
    },
    enabled: !!session?.user?.id && !!customerName
  });

  // Fetch status history when a request is selected
  useEffect(() => {
    const fetchStatusHistory = async () => {
      if (!selectedRequest) {
        setStatusHistory([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('customer_pendency_status_history')
          .select('*')
          .eq('request_id', selectedRequest.id)
          .order('changed_at', { ascending: true });

        if (error) throw error;
        setStatusHistory(data || []);
      } catch (error) {
        console.error('Error fetching status history:', error);
        setStatusHistory([]);
      }
    };

    fetchStatusHistory();
  }, [selectedRequest]);

  const handleDeleteRequest = async () => {
    if (!deleteRequestId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('customer_pendency_requests')
        .delete()
        .eq('id', deleteRequestId);

      if (error) throw error;

      toast({
        title: "Solicitação deletada",
        description: "A solicitação foi removida com sucesso.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['customer-pendency-requests'] });
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
      
      setDeleteRequestId(null);
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar a solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRequests = requests?.filter(request => {
    const matchesSearch = request.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Minhas Solicitações</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o status de suas solicitações de pendência
          </p>
        </div>
        <Button onClick={() => navigate('/customer-pendency-request')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID do pedido ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="under_review">Em Análise</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
                <SelectItem value="converted">Convertido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">Carregando...</div>
          ) : filteredRequests && filteredRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>ID Pedido</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{request.order_id}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {request.description}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={request.priority} />
                    </TableCell>
                    <TableCell>
                      <RequestStatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteRequestId(request.id)}
                          disabled={request.status === 'converted'}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma solicitação encontrada
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>ID do Pedido: {selectedRequest?.order_id}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Data de Criação</h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedRequest.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Status</h4>
                <RequestStatusBadge status={selectedRequest.status} />
              </div>

              <div>
                <h4 className="font-semibold mb-1">Prioridade</h4>
                <PriorityBadge priority={selectedRequest.priority} />
              </div>

              <div>
                <h4 className="font-semibold mb-1">Descrição</h4>
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>

              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Anexos ({selectedRequest.attachments.length})</h4>
                  <div className="space-y-2">
                    {selectedRequest.attachments.map((file, index) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.rejection_reason && (
                <div className="bg-destructive/10 p-4 rounded-lg">
                  <h4 className="font-semibold mb-1 text-destructive">Motivo da Rejeição</h4>
                  <p className="text-sm">{selectedRequest.rejection_reason}</p>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <RequestTimeline history={statusHistory} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRequestId} onOpenChange={() => setDeleteRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta solicitação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </main>
      </div>
    </div>
  );
}
