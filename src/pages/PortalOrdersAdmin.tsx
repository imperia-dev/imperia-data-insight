import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  cpf_cnpj: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string;
  language_pair: string | null;
  translation_type: string | null;
  status: string;
  total_documents: number | null;
  total_pages: number | null;
  total_characters: number | null;
  notes: string | null;
  submitted_at: string | null;
  created_at: string;
  external_link: string | null;
  external_id: string | null;
  trial_customers: Customer | null;
};

const STATUS_OPTIONS = ["draft", "submitted", "processing", "completed", "cancelled"];

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (s) {
    case "completed": return "default";
    case "processing": return "secondary";
    case "submitted": return "outline";
    case "cancelled": return "destructive";
    default: return "outline";
  }
};

export default function PortalOrdersAdmin() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const { mainContainerClass } = usePageLayout();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trial_orders")
      .select("*, trial_customers(id, full_name, email, phone, company, cpf_cnpj)")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar pedidos", description: error.message, variant: "destructive" });
    } else {
      setOrders((data ?? []) as unknown as OrderRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        o.order_number?.toLowerCase().includes(q) ||
        o.trial_customers?.full_name?.toLowerCase().includes(q) ||
        o.trial_customers?.email?.toLowerCase().includes(q) ||
        o.trial_customers?.company?.toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole || ""} />
      <div className={mainContainerClass}>
        <Header userName={user?.email || ""} userRole={userRole || ""} />
        <main className="p-4 md:p-6 lg:p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Pedidos do Portal</h1>
            <p className="text-muted-foreground">Pedidos enviados pelos clientes através do Portal de Traduções.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Buscar por número, cliente, email ou empresa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-md"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={loadOrders} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Usuário (criador)</TableHead>
                      <TableHead>Idioma</TableHead>
                      <TableHead className="text-right">Docs</TableHead>
                      <TableHead className="text-right">Pgs</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enviado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhum pedido encontrado.</TableCell></TableRow>
                    ) : filtered.map((o) => (
                      <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate(`/portal-orders/${o.id}`)}>
                        <TableCell className="font-mono text-sm">{o.order_number}</TableCell>
                        <TableCell>
                          <div className="font-medium">{o.trial_customers?.full_name ?? "-"}</div>
                          <div className="text-xs text-muted-foreground">{o.trial_customers?.email}</div>
                        </TableCell>
                        <TableCell className="text-sm">{o.language_pair ?? "-"}</TableCell>
                        <TableCell className="text-right">{o.total_documents ?? 0}</TableCell>
                        <TableCell className="text-right">{o.total_pages ?? 0}</TableCell>
                        <TableCell><Badge variant={statusVariant(o.status)}>{o.status}</Badge></TableCell>
                        <TableCell className="text-sm">
                          {o.submitted_at ? format(new Date(o.submitted_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/portal-orders/${o.id}`)}>
                            <Eye className="h-4 w-4 mr-1" /> Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
