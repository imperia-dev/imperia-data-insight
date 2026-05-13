import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrialCustomer } from "../TrialPortalGuard";

type Order = {
  id: string;
  order_number: string;
  language_pair: string;
  status: string;
  total_documents: number;
  total_pages: number;
  created_at: string;
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "outline" },
  submitted: { label: "Enviado", variant: "default" },
  processing: { label: "Em processamento", variant: "secondary" },
  completed: { label: "Concluído", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function PortalOrders() {
  const { customer } = useTrialCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (statusFilter === "all" || o.status === statusFilter) &&
          (!search || o.order_number.toLowerCase().includes(search.toLowerCase())),
      ),
    [orders, search, statusFilter],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground">Todos os seus pedidos de tradução.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de pedidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Buscar pelo número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="submitted">Enviado</SelectItem>
                <SelectItem value="processing">Em processamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum pedido encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Pedido</th>
                    <th className="py-2 pr-4">Idioma</th>
                    <th className="py-2 pr-4">Docs / Pág.</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Data</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
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
  );
}
