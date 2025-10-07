import { MoreVertical, CheckCircle, XCircle, DollarSign, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AssignOperationUserDialog } from "./AssignOperationUserDialog";

interface ReviewerProtocolActionsDropdownProps {
  protocol: any;
  userRole: string;
  onUpdate: () => void;
}

export const ReviewerProtocolActionsDropdown = ({
  protocol,
  userRole,
  onUpdate,
}: ReviewerProtocolActionsDropdownProps) => {
  const { user } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>("");

  // Sequência correta: Criado → Master Inicial (vincular operation) → Operation insere dados → Master Final → Owner → Pagamento
  const canGenerateProtocol = protocol.status === 'draft' && userRole === 'owner';
  const canApproveMasterInitial = protocol.status === 'pending_approval' && ['master', 'owner'].includes(userRole);
  const canInsertData = protocol.status === 'master_initial' && protocol.assigned_operation_user_id === user?.id && userRole === 'operation';
  const canApproveMasterFinal = protocol.status === 'data_inserted' && ['master', 'owner'].includes(userRole);
  const canApproveOwner = protocol.status === 'master_final' && userRole === 'owner';
  const canMarkAsPaid = protocol.status === 'owner_approval' && userRole === 'owner';
  const canCancel = protocol.status === 'draft' && userRole === 'owner';

  const handleAction = async (action: string) => {
    // Aprovação master inicial abre dialog especial para vincular usuário operation
    if (action === 'approve_master_initial') {
      setAssignDialogOpen(true);
      return;
    }
    
    setActionType(action);
    setConfirmOpen(true);
  };

  const executeAction = async () => {
    try {
      let updateData: any = {};

      switch (actionType) {
        case 'generate_protocol':
          // Quando gerar protocolo, remove o prefixo RAS-
          const currentNumber = protocol.protocol_number;
          const newNumber = currentNumber.startsWith('RAS-') 
            ? currentNumber.replace('RAS-', '') 
            : currentNumber;
          
          updateData = {
            status: 'pending_approval',
            protocol_number: newNumber,
          };
          break;
        case 'approve_master_initial':
          // Esta ação agora é tratada pelo AssignOperationUserDialog
          return;
        case 'insert_data':
          updateData = {
            status: 'data_inserted',
          };
          break;
        case 'approve_master_final':
          updateData = {
            status: 'master_final',
            master_final_approved_at: new Date().toISOString(),
            master_final_approved_by: user?.id,
          };
          break;
        case 'approve_owner':
          updateData = {
            status: 'owner_approval',
            owner_approved_at: new Date().toISOString(),
            owner_approved_by: user?.id,
          };
          break;
        case 'mark_paid':
          updateData = {
            status: 'paid',
            paid_at: new Date().toISOString(),
          };
          break;
        case 'cancel':
          updateData = {
            status: 'cancelled',
          };
          break;
      }

      const { error } = await supabase
        .from('reviewer_protocols')
        .update(updateData)
        .eq('id', protocol.id);

      if (error) throw error;

      toast.success("Protocolo atualizado com sucesso!");
      onUpdate();
    } catch (error: any) {
      console.error('Error updating protocol:', error);
      toast.error("Erro ao atualizar protocolo: " + error.message);
    } finally {
      setConfirmOpen(false);
    }
  };

  const getActionLabel = () => {
    switch (actionType) {
      case 'generate_protocol':
        return 'Gerar Protocolo';
      case 'approve_master_initial':
        return 'Aprovação Master - Inicial';
      case 'insert_data':
        return 'Confirmar Inserção de Dados e Nota Fiscal';
      case 'approve_master_final':
        return 'Aprovação Master - Final';
      case 'approve_owner':
        return 'Aprovação Owner';
      case 'mark_paid':
        return 'Marcar como Pago';
      case 'cancel':
        return 'Cancelar Protocolo';
      default:
        return '';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canGenerateProtocol && (
            <DropdownMenuItem onClick={() => handleAction('generate_protocol')}>
              <FileText className="mr-2 h-4 w-4" />
              Gerar Protocolo
            </DropdownMenuItem>
          )}
          {canApproveMasterInitial && (
            <DropdownMenuItem onClick={() => handleAction('approve_master_initial')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Aprovação Master - Inicial
            </DropdownMenuItem>
          )}
          {canInsertData && (
            <DropdownMenuItem onClick={() => handleAction('insert_data')}>
              <FileText className="mr-2 h-4 w-4" />
              Confirmar Inserção de Dados e NF
            </DropdownMenuItem>
          )}
          {canApproveMasterFinal && (
            <DropdownMenuItem onClick={() => handleAction('approve_master_final')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Aprovação Master - Final
            </DropdownMenuItem>
          )}
          {canApproveOwner && (
            <DropdownMenuItem onClick={() => handleAction('approve_owner')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Aprovação Owner
            </DropdownMenuItem>
          )}
          {canMarkAsPaid && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAction('mark_paid')}>
                <DollarSign className="mr-2 h-4 w-4" />
                Marcar como Pago
              </DropdownMenuItem>
            </>
          )}
          {canCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAction('cancel')} className="text-destructive">
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar Protocolo
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja executar: <strong>{getActionLabel()}</strong>?
              {actionType === 'cancel' && " Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssignOperationUserDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        protocolId={protocol.id}
        onSuccess={onUpdate}
      />
    </>
  );
};