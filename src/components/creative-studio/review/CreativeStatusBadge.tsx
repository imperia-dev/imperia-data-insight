import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type CreativeStatus = Database["public"]["Enums"]["creative_status"];

const labels: Record<CreativeStatus, string> = {
  generated: "Gerado",
  approved: "Aprovado",
  rejected: "Reprovado",
  adjusted: "Ajustado",
};

export function CreativeStatusBadge({ status }: { status: CreativeStatus }) {
  const variant =
    status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary";

  return <Badge variant={variant}>{labels[status] ?? status}</Badge>;
}
