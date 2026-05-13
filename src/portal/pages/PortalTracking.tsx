import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Circle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrialCustomer } from "../TrialPortalGuard";
import { cn } from "@/lib/utils";

type Order = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  total_documents: number;
  total_pages: number;
};

const steps = [
  { key: "submitted", label: "Enviado" },
  { key: "processing", label: "Em processamento" },
  { key: "completed", label: "Concluído" },
];

function getStepIndex(status: string) {
  if (status === "completed") return 2;
  if (status === "processing") return 1;
  if (status === "submitted") return 0;
  return -1;
}

export default function PortalTracking() {
  const { customer } = useTrialCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    (async () => {
      const { data } = await supabase
        .from("trial_orders")
        .select("id, order_number, status, created_at, submitted_at, total_documents, total_pages")
        .eq("customer_id", customer.id)
        .in("status", ["submitted", "processing"])
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [customer]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Acompanhamento</h1>
        <p className="text-muted-foreground">Veja o andamento detalhado dos seus pedidos ativos.</p>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum pedido em andamento no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const current = getStepIndex(o.status);
            return (
              <Card key={o.id}>
                <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-lg">{o.order_number}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enviado em {o.submitted_at ? new Date(o.submitted_at).toLocaleString("pt-BR") : "—"} ·
                      {" "}{o.total_documents} doc · {o.total_pages} pág.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/portal/app/pedido/${o.id}`}>Ver detalhes</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    {steps.map((step, idx) => {
                      const done = idx <= current;
                      const isCurrent = idx === current;
                      return (
                        <div key={step.key} className="flex-1 flex flex-col items-center gap-2 relative">
                          <div
                            className={cn(
                              "h-9 w-9 rounded-full flex items-center justify-center border-2 transition",
                              done
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-background border-muted text-muted-foreground",
                              isCurrent && "ring-4 ring-primary/20",
                            )}
                          >
                            {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </div>
                          <span className={cn("text-xs text-center", done ? "font-medium" : "text-muted-foreground")}>
                            {step.label}
                          </span>
                          {idx < steps.length - 1 && (
                            <div
                              className={cn(
                                "absolute top-4 left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] h-0.5",
                                idx < current ? "bg-primary" : "bg-muted",
                              )}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
