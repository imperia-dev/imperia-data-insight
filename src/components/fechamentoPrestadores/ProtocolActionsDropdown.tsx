import { MoreHorizontal, Send, CheckCircle, DollarSign, XCircle, Mail, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProtocolActionsDropdownProps {
  protocol: any;
  onAction: (action: string, protocol: any) => void;
}

export function ProtocolActionsDropdown({ protocol, onAction }: ProtocolActionsDropdownProps) {
  const { status } = protocol;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onAction("details", protocol)}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Detalhes
        </DropdownMenuItem>

        {status === "draft" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("send_approval", protocol)}>
              <Send className="h-4 w-4 mr-2" />
              Enviar para Aprovação
            </DropdownMenuItem>
          </>
        )}

        {status === "awaiting_provider" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("resend_link", protocol)}>
              <Mail className="h-4 w-4 mr-2" />
              Reenviar Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction("approve_manual", protocol)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar Manualmente
            </DropdownMenuItem>
          </>
        )}

        {(status === "provider_approved" || status === "awaiting_final") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("approve_final", protocol)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar Final
            </DropdownMenuItem>
          </>
        )}

        {(status === "approved" || status === "completed") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("mark_paid", protocol)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Marcar como Pago
            </DropdownMenuItem>
          </>
        )}

        {status !== "cancelled" && status !== "paid" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onAction("cancel", protocol)}
              className="text-destructive focus:text-destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar Protocolo
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onAction("delete", protocol)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Deletar Protocolo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
