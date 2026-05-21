// Status helpers for trial_orders (Portal de Traduções).
// Sub-etapas internas de "processing" NUNCA podem aparecer ao cliente.

export type OrderStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "processing"
  | "completed"
  | "delivered"
  | "received"
  | "cancelled";

export const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Pedido realizado",
  accepted: "Pedido aceito",
  processing: "Em processamento",
  completed: "Finalizado",
  delivered: "Entregue",
  received: "Recebido",
  cancelled: "Cancelado",
};

export const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  submitted: "outline",
  accepted: "secondary",
  processing: "secondary",
  completed: "default",
  delivered: "default",
  received: "default",
  cancelled: "destructive",
};

// Timeline pública (cliente)
export const CUSTOMER_TIMELINE = [
  { key: "submitted", label: "Pedido realizado", desc: "Recebemos seu pedido" },
  { key: "accepted", label: "Pedido aceito", desc: "Iniciaremos em breve" },
  { key: "processing", label: "Em processamento", desc: "Tradução em andamento" },
  { key: "completed", label: "Finalizado", desc: "Pronto para entrega" },
  { key: "delivered", label: "Entregue", desc: "Arquivos disponibilizados" },
  { key: "received", label: "Recebido", desc: "Confirmação do cliente" },
] as const;

// Sub-etapas internas — uso restrito a owner/admin
export const PROCESSING_STEPS = [
  "Diagramação",
  "Tradução automática",
  "Revisão tradução",
  "Claude CQ",
  "Assinatura",
  "Last review",
] as const;

export const PROCESSING_TOTAL = PROCESSING_STEPS.length;

export function customerTimelineIndex(status: string): number {
  if (status === "cancelled" || status === "draft") return -1;
  return CUSTOMER_TIMELINE.findIndex((t) => t.key === status);
}
