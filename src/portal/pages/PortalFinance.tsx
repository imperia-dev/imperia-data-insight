import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, CheckCircle2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrialCustomer } from "../TrialPortalGuard";

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_pages: number;
  total_characters: number;
  created_at: string;
};

export default function PortalFinance() {
  const { customer } = useTrialCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    (async () => {
      const { data } = await supabase
        .from("trial_orders")
        .select("id, order_number, status, total_pages, total_characters, created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [customer]);

  const completed = orders.filter((o) => o.status === "completed");
  const totalPages = orders.reduce((acc, o) => acc + (o.total_pages || 0), 0);
  const totalChars = orders.reduce((acc, o) => acc + (o.total_characters || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Resumo de consumo dos seus pedidos.</p>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Pedidos no total</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{orders.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Pedidos concluídos</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{completed.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Páginas traduzidas</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{totalPages}</div><p className="text-xs text-muted-foreground mt-1">{totalChars.toLocaleString("pt-BR")} caracteres</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum pedido registrado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground border-b">
                      <tr>
                        <th className="py-2 pr-4">Pedido</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Páginas</th>
                        <th className="py-2 pr-4">Caracteres</th>
                        <th className="py-2 pr-4">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{o.order_number}</td>
                          <td className="py-3 pr-4">{o.status}</td>
                          <td className="py-3 pr-4">{o.total_pages}</td>
                          <td className="py-3 pr-4">{(o.total_characters || 0).toLocaleString("pt-BR")}</td>
                          <td className="py-3 pr-4">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            Os valores monetários e faturas estarão disponíveis em breve.
          </p>
        </>
      )}
    </div>
  );
}
