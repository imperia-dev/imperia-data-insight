import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { sanitizeInput } from "@/lib/validations/sanitized";

interface RecipientEmail {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  is_active: boolean;
}

export function ManageRecipientsDialog() {
  const [open, setOpen] = useState(false);
  const [recipients, setRecipients] = useState<RecipientEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    email: "",
    name: "",
    company: ""
  });
  const [newRecipient, setNewRecipient] = useState({
    email: "",
    name: "",
    company: ""
  });

  useEffect(() => {
    if (open) {
      fetchRecipients();
    }
  }, [open]);

  const fetchRecipients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_recipient_emails')
        .select('*')
        .order('company', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setRecipients(data || []);
    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar destinatários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newRecipient.email) {
      toast({
        title: "Atenção",
        description: "Informe o e-mail do destinatário",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_recipient_emails')
        .insert({
          email: sanitizeInput(newRecipient.email.trim()),
          name: sanitizeInput(newRecipient.name) || null,
          company: sanitizeInput(newRecipient.company) || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Erro",
            description: "Este e-mail já está cadastrado",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Sucesso",
        description: "Destinatário adicionado com sucesso",
      });

      setNewRecipient({ email: "", name: "", company: "" });
      fetchRecipients();
    } catch (error) {
      console.error('Error adding recipient:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar destinatário",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (recipient: RecipientEmail) => {
    setEditingId(recipient.id);
    setEditForm({
      email: recipient.email,
      name: recipient.name || "",
      company: recipient.company || ""
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_recipient_emails')
        .update({
          email: sanitizeInput(editForm.email.trim()),
          name: sanitizeInput(editForm.name) || null,
          company: sanitizeInput(editForm.company) || null
        })
        .eq('id', id);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Erro",
            description: "Este e-mail já está cadastrado",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Sucesso",
        description: "Destinatário atualizado com sucesso",
      });

      setEditingId(null);
      fetchRecipients();
    } catch (error) {
      console.error('Error updating recipient:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar destinatário",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_recipient_emails')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: isActive ? "Destinatário ativado" : "Destinatário desativado",
      });

      fetchRecipients();
    } catch (error) {
      console.error('Error toggling recipient status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este destinatário?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payment_recipient_emails')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Destinatário excluído com sucesso",
      });

      fetchRecipients();
    } catch (error) {
      console.error('Error deleting recipient:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir destinatário",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Destinatários de E-mail</DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova destinatários para solicitações de pagamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new recipient form */}
          <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-sm font-medium">Adicionar Novo Destinatário</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="new-email">E-mail *</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="email@empresa.com"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="new-name">Nome</Label>
                <Input
                  id="new-name"
                  placeholder="Nome do contato"
                  value={newRecipient.name}
                  onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="new-company">Empresa</Label>
                <Input
                  id="new-company"
                  placeholder="Nome da empresa"
                  value={newRecipient.company}
                  onChange={(e) => setNewRecipient({ ...newRecipient, company: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleAdd} className="w-fit">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {/* Recipients table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : recipients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum destinatário cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell>
                        {editingId === recipient.id ? (
                          <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <span className="font-medium">{recipient.email}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === recipient.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          recipient.name || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === recipient.id ? (
                          <Input
                            value={editForm.company}
                            onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          recipient.company || "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={recipient.is_active}
                            onCheckedChange={(checked) => handleToggleActive(recipient.id, checked)}
                            disabled={editingId === recipient.id}
                          />
                          <Badge variant={recipient.is_active ? "default" : "secondary"}>
                            {recipient.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === recipient.id ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSaveEdit(recipient.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(recipient)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(recipient.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}