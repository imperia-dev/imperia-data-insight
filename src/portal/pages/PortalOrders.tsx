import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTrialCustomer } from "../TrialPortalGuard";

type Order = {
  id: string;
  order_number: string;
  customer_reference: string | null;
  language_pair: string;
  status: string;
  total_documents: number;
  total_pages: number;
  created_at: string;
};

import { STATUS_LABEL, STATUS_VARIANT } from "@/portal/lib/orderStatus";
const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> =
  Object.fromEntries(Object.keys(STATUS_LABEL).map((k) => [k, { label: STATUS_LABEL[k], variant: STATUS_VARIANT[k] ?? "outline" }]));

export default function PortalOrders() {
  const { customer } = useTrialCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "all");
  const [toDelete, setToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOrders = async () => {
    if (!customer) return;
    const { data } = await supabase
      .from("trial_orders")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!customer) return;
    loadOrders();
  }, [customer]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("trial_orders").delete().eq("id", toDelete.id);
    setDeleting(false);
    if (error) {
      toast.error("Não foi possível excluir o pedido. Apenas rascunhos podem ser excluídos.");
      return;
    }
    toast.success(`Pedido ${toDelete.order_number} excluído.`);
    setOrders((prev) => prev.filter((o) => o.id !== toDelete.id));
    setToDelete(null);
  };

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (statusFilter !== "all" && o.status !== statusFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          o.order_number.toLowerCase().includes(q) ||
          (o.customer_reference?.toLowerCase().includes(q) ?? false)
        );
      }),
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
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); if (v === "all") { searchParams.delete("status"); } else { searchParams.set("status", v); } setSearchParams(searchParams, { replace: true }); }}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
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
                        <td className="py-3 text-right whitespace-nowrap">
                          <Button asChild variant="ghost" size="sm"><Link to={`/portal/app/pedido/${o.id}`}>Ver</Link></Button>
                          {o.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setToDelete(o)}
                              aria-label={`Excluir pedido ${o.order_number}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O pedido <strong>{toDelete?.order_number}</strong> e seus arquivos serão removidos. Apenas rascunhos podem ser excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
