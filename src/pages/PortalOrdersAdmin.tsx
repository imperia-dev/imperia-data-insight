import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, ExternalLink, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  trial_customers: Customer | null;
};

type FileRow = {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  pages: number | null;
  characters: number | null;
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

const formatBytes = (n: number | null) => {
  if (!n) return "-";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

export default function PortalOrdersAdmin() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  const openDetail = async (order: OrderRow) => {
    setSelected(order);
    setFiles([]);
    setFilesLoading(true);
    const { data, error } = await supabase
      .from("trial_order_files")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar arquivos", description: error.message, variant: "destructive" });
    } else {
      setFiles((data ?? []) as FileRow[]);
    }
    setFilesLoading(false);
  };

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("trial-uploads")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao gerar link", description: error?.message ?? "Falha", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const downloadFile = async (path: string, filename: string) => {
    const { data, error } = await supabase.storage
      .from("trial-uploads")
      .createSignedUrl(path, 300, { download: filename });
    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao baixar", description: error?.message ?? "Falha", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const updateStatus = async (newStatus: string) => {
    if (!selected) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("trial_orders")
      .update({ status: newStatus as OrderRow["status"] })
      .eq("id", selected.id);
    setUpdatingStatus(false);
    if (error) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status atualizado" });
    setSelected({ ...selected, status: newStatus });
    setOrders((prev) => prev.map((o) => (o.id === selected.id ? { ...o, status: newStatus } : o)));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
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
                  <TableHead>Cliente</TableHead>
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
                  <TableRow key={o.id}>
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
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openDetail(o)}>
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

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Pedido {selected.order_number}</SheetTitle>
                <SheetDescription>
                  Criado em {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section className="space-y-2">
                  <h3 className="font-semibold">Cliente</h3>
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">Nome:</span> {selected.trial_customers?.full_name}</div>
                    <div><span className="text-muted-foreground">Email:</span> {selected.trial_customers?.email}</div>
                    <div><span className="text-muted-foreground">Telefone:</span> {selected.trial_customers?.phone ?? "-"}</div>
                    <div><span className="text-muted-foreground">Empresa:</span> {selected.trial_customers?.company ?? "-"}</div>
                    <div><span className="text-muted-foreground">CPF/CNPJ:</span> {selected.trial_customers?.cpf_cnpj ?? "-"}</div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold">Pedido</h3>
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">Idioma:</span> {selected.language_pair ?? "-"}</div>
                    <div><span className="text-muted-foreground">Tipo:</span> {selected.translation_type ?? "-"}</div>
                    <div><span className="text-muted-foreground">Documentos:</span> {selected.total_documents ?? 0}</div>
                    <div><span className="text-muted-foreground">Páginas:</span> {selected.total_pages ?? 0}</div>
                    <div><span className="text-muted-foreground">Caracteres:</span> {selected.total_characters ?? 0}</div>
                    {selected.notes && (
                      <div><span className="text-muted-foreground">Observações:</span> {selected.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Select value={selected.status} onValueChange={updateStatus} disabled={updatingStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {updatingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold">Documentos</h3>
                  {filesLoading ? (
                    <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
                  ) : files.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p>
                  ) : (
                    <div className="space-y-2">
                      {files.map((f) => (
                        <div key={f.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="font-medium text-sm truncate">{f.original_filename}</div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {f.mime_type ?? "?"} · {formatBytes(f.size_bytes)} · {f.pages ?? 0} pgs · {f.characters ?? 0} chars
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => openFile(f.storage_path)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => downloadFile(f.storage_path, f.original_filename)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
