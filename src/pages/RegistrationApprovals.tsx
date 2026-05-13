import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock, User, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { sanitizeInput } from "@/lib/validations/sanitized";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLocation } from "react-router-dom";

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

interface TrialCustomer {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string | null;
  cpf_cnpj: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'deactivated';
  created_at: string;
  rejection_reason: string | null;
}

export default function RegistrationApprovals() {
  const location = useLocation();
  const { userRole } = useRoleAccess(location.pathname);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [trialCustomers, setTrialCustomers] = useState<TrialCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Trial customer dialog state
  const [selectedTrial, setSelectedTrial] = useState<TrialCustomer | null>(null);
  const [trialActionType, setTrialActionType] = useState<'approve' | 'reject' | null>(null);
  const [trialRejectionReason, setTrialRejectionReason] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchRegistrationRequests(), fetchTrialCustomers()]);
    setLoading(false);
  };

  const fetchRegistrationRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('registration_requests')
        .select(`*, profile:profiles!user_id ( full_name, email, role )`)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching registration requests:', error);
      toast({ title: "Erro", description: "Erro ao carregar solicitações de cadastro", variant: "destructive" });
    }
  };

  const fetchTrialCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('trial_customers')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTrialCustomers((data as TrialCustomer[]) || []);
    } catch (error) {
      console.error('Error fetching trial customers:', error);
      toast({ title: "Erro", description: "Erro ao carregar clientes do portal", variant: "destructive" });
    }
  };

  const handleApprove = async (request: RegistrationRequest) => {
    setProcessingId(request.user_id);
    try {
      const { error } = await supabase.rpc('approve_user', {
        p_user_id: request.user_id,
        p_notes: sanitizeInput(notes),
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: `Usuário ${request.profile?.full_name} aprovado com sucesso` });
      await fetchRegistrationRequests();
      setSelectedRequest(null);
      setNotes("");
    } catch (error) {
      console.error('Error approving user:', error);
      toast({ title: "Erro", description: "Erro ao aprovar usuário", variant: "destructive" });
    } finally {
      setProcessingId(null);
      setActionType(null);
    }
  };

  const handleReject = async (request: RegistrationRequest) => {
    if (!rejectionReason.trim()) {
      toast({ title: "Erro", description: "Por favor, forneça um motivo para a rejeição", variant: "destructive" });
      return;
    }
    setProcessingId(request.user_id);
    try {
      const { error } = await supabase.rpc('reject_user', {
        p_user_id: request.user_id,
        p_reason: sanitizeInput(rejectionReason),
        p_notes: sanitizeInput(notes),
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: `Usuário ${request.profile?.full_name} rejeitado` });
      await fetchRegistrationRequests();
      setSelectedRequest(null);
      setNotes("");
      setRejectionReason("");
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({ title: "Erro", description: "Erro ao rejeitar usuário", variant: "destructive" });
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

  const sendTrialEmail = async (c: TrialCustomer, status: 'approved' | 'rejected', reason?: string) => {
    try {
      await supabase.functions.invoke('send-trial-status-email', {
        body: { recipient_email: c.email, recipient_name: c.full_name, status, reason },
      });
    } catch (e) {
      console.error('send-trial-status-email failed', e);
    }
  };

  const handleApproveTrial = async (c: TrialCustomer) => {
    setProcessingId(c.id);
    try {
      const { error } = await supabase.rpc('approve_trial_customer', { _customer_id: c.id });
      if (error) throw error;
      toast({ title: "Sucesso", description: `Cliente ${c.full_name} aprovado` });
      await sendTrialEmail(c, 'approved');
      await fetchTrialCustomers();
      setSelectedTrial(null);
    } catch (error: any) {
      console.error('Error approving trial customer:', error);
      toast({ title: "Erro", description: error.message || "Erro ao aprovar cliente", variant: "destructive" });
    } finally {
      setProcessingId(null);
      setTrialActionType(null);
    }
  };

  const handleRejectTrial = async (c: TrialCustomer) => {
    if (!trialRejectionReason.trim()) {
      toast({ title: "Erro", description: "Informe o motivo da rejeição", variant: "destructive" });
      return;
    }
    setProcessingId(c.id);
    try {
      const { error } = await supabase.rpc('reject_trial_customer', {
        _customer_id: c.id,
        _reason: sanitizeInput(trialRejectionReason),
      });
      if (error) throw error;
      toast({ title: "Sucesso", description: `Cliente ${c.full_name} rejeitado` });
      await sendTrialEmail(c, 'rejected', trialRejectionReason);
      await fetchTrialCustomers();
      setSelectedTrial(null);
      setTrialRejectionReason("");
    } catch (error: any) {
      console.error('Error rejecting trial customer:', error);
      toast({ title: "Erro", description: error.message || "Erro ao rejeitar cliente", variant: "destructive" });
    } finally {
      setProcessingId(null);
      setTrialActionType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole={userRole || 'owner'} />
        <div className="flex-1 md:ml-64 transition-all duration-300">
          <Header userName={userRole || 'owner'} userRole={userRole || 'owner'} />
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole || 'owner'} />
      <div className="flex-1 md:ml-64 transition-all duration-300">
        <Header userName={userRole || 'owner'} userRole={userRole || 'owner'} />
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            <Tabs defaultValue="team">
              <TabsList>
                <TabsTrigger value="team" className="gap-2">
                  <User className="h-4 w-4" /> Equipe interna
                  {requests.length > 0 && <Badge variant="secondary" className="ml-1">{requests.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="trial" className="gap-2">
                  <Briefcase className="h-4 w-4" /> Clientes do Portal
                  {trialCustomers.length > 0 && <Badge variant="secondary" className="ml-1">{trialCustomers.length}</Badge>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="team">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Aprovação de Cadastros — Equipe</CardTitle>
                    <CardDescription>Solicitações de acesso de colaboradores internos.</CardDescription>
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
                            <TableHead>Solicitado em</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell className="font-medium">{request.profile?.full_name || 'N/A'}</TableCell>
                              <TableCell>{request.profile?.email || 'N/A'}</TableCell>
                              <TableCell><Badge variant="outline">{request.profile?.role || 'operation'}</Badge></TableCell>
                              <TableCell>{format(new Date(request.requested_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</TableCell>
                              <TableCell><Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge></TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button size="sm" onClick={() => openActionDialog(request, 'approve')} disabled={processingId === request.user_id}>
                                    <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => openActionDialog(request, 'reject')} disabled={processingId === request.user_id}>
                                    <XCircle className="h-4 w-4 mr-1" /> Rejeitar
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
              </TabsContent>

              <TabsContent value="trial">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Clientes do Portal Trial</CardTitle>
                    <CardDescription>Cadastros realizados em <code>/portal/cadastro</code> aguardando liberação.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {trialCustomers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p>Nenhum cliente pendente</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead>CPF/CNPJ</TableHead>
                            <TableHead>Cadastrado em</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trialCustomers.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.full_name}</TableCell>
                              <TableCell>{c.email}</TableCell>
                              <TableCell>{c.phone}</TableCell>
                              <TableCell>{c.company || '—'}</TableCell>
                              <TableCell>{c.cpf_cnpj || '—'}</TableCell>
                              <TableCell>{format(new Date(c.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => { setSelectedTrial(c); setTrialActionType('approve'); }}
                                    disabled={processingId === c.id}
                                  >
                                    {processingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1" /> Aprovar</>}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => { setSelectedTrial(c); setTrialActionType('reject'); setTrialRejectionReason(""); }}
                                    disabled={processingId === c.id}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" /> Rejeitar
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
              </TabsContent>
            </Tabs>

            {/* Internal user dialog */}
            <Dialog open={!!selectedRequest && !!actionType} onOpenChange={(open) => {
              if (!open) { setSelectedRequest(null); setActionType(null); setNotes(""); setRejectionReason(""); }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{actionType === 'approve' ? 'Aprovar' : 'Rejeitar'} Cadastro</DialogTitle>
                  <DialogDescription>
                    {actionType === 'approve'
                      ? `Você está prestes a aprovar o cadastro de ${selectedRequest?.profile?.full_name}.`
                      : `Você está prestes a rejeitar o cadastro de ${selectedRequest?.profile?.full_name}.`}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {actionType === 'reject' && (
                    <div>
                      <label className="text-sm font-medium">Motivo da Rejeição <span className="text-destructive">*</span></label>
                      <Textarea placeholder="Explique o motivo..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-1" />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Observações (opcional)</label>
                    <Textarea placeholder="Observações internas..." value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setSelectedRequest(null); setActionType(null); setNotes(""); setRejectionReason(""); }}>Cancelar</Button>
                  <Button
                    variant={actionType === 'approve' ? 'default' : 'destructive'}
                    onClick={() => { if (selectedRequest) actionType === 'approve' ? handleApprove(selectedRequest) : handleReject(selectedRequest); }}
                    disabled={processingId === selectedRequest?.user_id}
                  >
                    {processingId === selectedRequest?.user_id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {actionType === 'approve' ? 'Aprovar' : 'Rejeitar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Trial customer dialog */}
            <Dialog open={!!selectedTrial && !!trialActionType} onOpenChange={(open) => {
              if (!open) { setSelectedTrial(null); setTrialActionType(null); setTrialRejectionReason(""); }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{trialActionType === 'approve' ? 'Aprovar' : 'Rejeitar'} Cliente do Portal</DialogTitle>
                  <DialogDescription>
                    {trialActionType === 'approve'
                      ? `Liberar o acesso de ${selectedTrial?.full_name} ao portal trial?`
                      : `Rejeitar o cadastro de ${selectedTrial?.full_name}?`}
                  </DialogDescription>
                </DialogHeader>
                {trialActionType === 'reject' && (
                  <div>
                    <label className="text-sm font-medium">Motivo da Rejeição <span className="text-destructive">*</span></label>
                    <Textarea placeholder="Explique o motivo..." value={trialRejectionReason} onChange={(e) => setTrialRejectionReason(e.target.value)} className="mt-1" />
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setSelectedTrial(null); setTrialActionType(null); setTrialRejectionReason(""); }}>Cancelar</Button>
                  <Button
                    variant={trialActionType === 'approve' ? 'default' : 'destructive'}
                    onClick={() => { if (selectedTrial) trialActionType === 'approve' ? handleApproveTrial(selectedTrial) : handleRejectTrial(selectedTrial); }}
                    disabled={processingId === selectedTrial?.id}
                  >
                    {processingId === selectedTrial?.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {trialActionType === 'approve' ? 'Aprovar' : 'Rejeitar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
