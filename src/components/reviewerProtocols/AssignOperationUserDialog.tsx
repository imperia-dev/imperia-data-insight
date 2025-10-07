import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AssignOperationUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolId: string;
  onSuccess: () => void;
}

interface OperationUser {
  id: string;
  full_name: string;
  email: string;
}

export const AssignOperationUserDialog = ({
  open,
  onOpenChange,
  protocolId,
  onSuccess,
}: AssignOperationUserDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [operationUsers, setOperationUsers] = useState<OperationUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      fetchOperationUsers();
    }
  }, [open]);

  const fetchOperationUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'operation')
        .eq('approval_status', 'approved')
        .order('full_name');

      if (error) throw error;

      setOperationUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching operation users:', error);
      toast.error("Erro ao carregar usuários de operação");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedUserId) {
      toast.error("Selecione um usuário de operação");
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('reviewer_protocols')
        .update({
          status: 'master_initial',
          master_initial_approved_at: new Date().toISOString(),
          master_initial_approved_by: (await supabase.auth.getUser()).data.user?.id,
          assigned_operation_user_id: selectedUserId,
          master_initial_notes: notes || null,
        })
        .eq('id', protocolId);

      if (error) throw error;

      toast.success("Protocolo aprovado e usuário de operação vinculado!");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setSelectedUserId("");
      setNotes("");
    } catch (error: any) {
      console.error('Error approving protocol:', error);
      toast.error("Erro ao aprovar protocolo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Aprovação Master - Inicial</DialogTitle>
          <DialogDescription>
            Selecione o usuário de operação responsável pela inserção dos dados e nota fiscal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="operation-user">Usuário de Operação *</Label>
            {loadingUsers ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={loading}
              >
                <SelectTrigger id="operation-user">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {operationUsers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum usuário de operação disponível
                    </SelectItem>
                  ) : (
                    operationUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre a aprovação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading || !selectedUserId || loadingUsers}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aprovar e Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
