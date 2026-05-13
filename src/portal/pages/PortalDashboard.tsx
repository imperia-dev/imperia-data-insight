import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PortalLayout } from "../PortalLayout";
import { TrialPortalGuard, useTrialCustomer } from "../TrialPortalGuard";

type Order = {
  id: string;
  order_number: string;
  language_pair: string;
  translation_type: string;
  status: string;
  total_documents: number;
  total_pages: number;
  total_characters: number;
  created_at: string;
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "outline" },
  submitted: { label: "Enviado", variant: "default" },
  processing: { label: "Em processamento", variant: "secondary" },
  completed: { label: "Concluído", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

function PortalDashboardInner() {
  const { customer } = useTrialCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    (async () => {
      const { data } = await supabase
        .from("trial_orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [customer]);

  return (
    <PortalLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Olá, {customer?.full_name.split(" ")[0]}</h1>
            <p className="text-muted-foreground">Acompanhe e crie pedidos de tradução PT ↔ IT.</p>
          </div>
          <Button asChild size="lg">
            <Link to="/portal/app/novo"><Plus className="h-4 w-4 mr-2" /> Novo pedido</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Meus pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Você ainda não tem pedidos. Crie o primeiro acima.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-4">Pedido</th>
                      <th className="py-2 pr-4">Idioma</th>
                      <th className="py-2 pr-4">Docs / Páginas</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Data</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const s = statusLabels[o.status] ?? { label: o.status, variant: "outline" as const };
                      return (
                        <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-3 pr-4 font-medium">{o.order_number}</td>
                          <td className="py-3 pr-4">{o.language_pair === "pt-it" ? "PT → IT" : "IT → PT"}</td>
                          <td className="py-3 pr-4">{o.total_documents} / {o.total_pages}</td>
                          <td className="py-3 pr-4"><Badge variant={s.variant}>{s.label}</Badge></td>
                          <td className="py-3 pr-4">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="py-3 text-right">
                            <Button asChild variant="ghost" size="sm"><Link to={`/portal/app/pedido/${o.id}`}>Ver</Link></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}

export default function PortalDashboard() {
  return <TrialPortalGuard><PortalDashboardInner /></TrialPortalGuard>;
}
