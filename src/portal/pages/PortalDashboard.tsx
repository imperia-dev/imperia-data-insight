import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, FileText, Activity, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrialCustomer } from "../TrialPortalGuard";

type Order = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
};

export default function PortalDashboard() {
  const { customer } = useTrialCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    (async () => {
      const { data } = await supabase
        .from("trial_orders")
        .select("id, order_number, status, created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [customer]);

  const total = orders.length;
  const inProgress = orders.filter((o) => ["submitted", "processing"].includes(o.status)).length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const last = orders[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Olá, {customer?.full_name.split(" ")[0]}</h1>
          <p className="text-muted-foreground">Visão geral da sua conta no Portal Impéria.</p>
        </div>
        <Button asChild size="lg">
          <Link to="/portal/app/novo"><Plus className="h-4 w-4 mr-2" /> Novo pedido</Link>
        </Button>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Total de pedidos</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4" /> Em andamento</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{inProgress}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Concluídos</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{completed}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Último pedido</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/portal/app/pedidos">Ver todos <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {last ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{last.order_number}</div>
                    <div className="text-sm text-muted-foreground">{new Date(last.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/portal/app/pedido/${last.id}`}>Abrir</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Você ainda não criou nenhum pedido.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
