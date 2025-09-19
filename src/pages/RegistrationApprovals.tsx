import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { Loader2, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RegistrationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  notes?: string;
  profile?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export default function RegistrationApprovals() {
  const { mainContainerClass } = useSidebarOffset();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchRegistrationRequests();
  }, []);

  const fetchRegistrationRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('registration_requests')
        .select(`
          *,
          profile:profiles!user_id (
            full_name,
            email,
            role
          )
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching registration requests:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar solicitações de cadastro",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: RegistrationRequest) => {
    setProcessingId(request.user_id);
    try {
      const { error } = await supabase.rpc('approve_user', {
        p_user_id: request.user_id,
        p_notes: notes
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Usuário ${request.profile?.full_name} aprovado com sucesso`,
      });

      await fetchRegistrationRequests();
      setSelectedRequest(null);
      setNotes("");
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar usuário",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
      setActionType(null);
    }
  };

  const handleReject = async (request: RegistrationRequest) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, forneça um motivo para a rejeição",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(request.user_id);
    try {
      const { error } = await supabase.rpc('reject_user', {
        p_user_id: request.user_id,
        p_reason: rejectionReason,
        p_notes: notes
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Usuário ${request.profile?.full_name} rejeitado`,
      });

      await fetchRegistrationRequests();
      setSelectedRequest(null);
      setNotes("");
      setRejectionReason("");
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: "Erro",
        description: "Erro ao rejeitar usuário",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
      setActionType(null);
    }
  };

  const openActionDialog = (request: RegistrationRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setNotes("");
    setRejectionReason("");
  };

  if (loading) {
    return (
      <div className={mainContainerClass}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={mainContainerClass}>
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Aprovação de Cadastros
            </CardTitle>
            <CardDescription>
              Gerencie as solicitações de cadastro pendentes
              {requests.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {requests.length} pendente{requests.length > 1 ? 's' : ''}
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Data de Solicitação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.profile?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{request.profile?.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.profile?.role || 'operation'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.requested_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pendente
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openActionDialog(request, 'approve')}
                            disabled={processingId === request.user_id}
                          >
                            {processingId === request.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprovar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openActionDialog(request, 'reject')}
                            disabled={processingId === request.user_id}
                          >
                            {processingId === request.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeitar
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Approval/Rejection Dialog */}
        <Dialog open={!!selectedRequest && !!actionType} onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setActionType(null);
            setNotes("");
            setRejectionReason("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Aprovar' : 'Rejeitar'} Cadastro
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve' 
                  ? `Você está prestes a aprovar o cadastro de ${selectedRequest?.profile?.full_name}.`
                  : `Você está prestes a rejeitar o cadastro de ${selectedRequest?.profile?.full_name}.`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {actionType === 'reject' && (
                <div>
                  <label className="text-sm font-medium">
                    Motivo da Rejeição <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    placeholder="Explique o motivo da rejeição..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">
                  Observações (opcional)
                </label>
                <Textarea
                  placeholder="Adicione observações internas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                  setNotes("");
                  setRejectionReason("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={() => {
                  if (selectedRequest) {
                    actionType === 'approve' 
                      ? handleApprove(selectedRequest)
                      : handleReject(selectedRequest);
                  }
                }}
                disabled={processingId === selectedRequest?.user_id}
              >
                {processingId === selectedRequest?.user_id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {actionType === 'approve' ? 'Aprovar' : 'Rejeitar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}