import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, FileText, Loader2, Download, Languages, FileSignature, Files,
  BookOpen, Type as TypeIcon, Calendar, Clock, User, Mail, Phone, Building2,
  IdCard, CheckCircle2, CircleDot, Circle, AlertCircle, MessageSquare, Hash, Copy, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Order = {
  id: string;
  order_number: string;
  language_pair: string;
  translation_type: string;
  status: string;
  total_documents: number;
  total_pages: number;
  total_characters: number;
  notes: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  customer_id: string;
};
type FileRow = {
  id: string; original_filename: string; pages: number; characters: number;
  analysis_status: string; size_bytes: number; mime_type: string; storage_path: string; created_at: string;
};
type Customer = {
  id: string; full_name: string; email: string; phone: string | null;
  company: string | null; cpf_cnpj: string | null;
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho", submitted: "Enviado", processing: "Em processamento",
  completed: "Concluído", cancelled: "Cancelado",
};
const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline", submitted: "default", processing: "secondary",
  completed: "default", cancelled: "destructive",
};

const TIMELINE = [
  { key: "draft", label: "Rascunho", desc: "Pedido iniciado" },
  { key: "submitted", label: "Enviado", desc: "Aguardando análise" },
  { key: "processing", label: "Em processamento", desc: "Tradução em andamento" },
  { key: "completed", label: "Concluído", desc: "Entrega finalizada" },
] as const;

function formatBytes(b: number) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="rounded-md bg-primary/10 text-primary p-2"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-lg font-semibold truncate">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderDetailInner() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: o } = await supabase.from("trial_orders").select("*").eq("id", id).maybeSingle();
      if (!o) { setLoading(false); return; }
      const [{ data: f }, { data: c }] = await Promise.all([
        supabase.from("trial_order_files")
          .select("id,original_filename,pages,characters,analysis_status,size_bytes,mime_type,storage_path,created_at")
          .eq("order_id", id).order("created_at"),
        supabase.from("trial_customers")
          .select("id,full_name,email,phone,company,cpf_cnpj")
          .eq("id", (o as Order).customer_id).maybeSingle(),
      ]);
      setOrder(o as Order);
      setFiles((f as FileRow[]) ?? []);
      setCustomer((c as Customer | null) ?? null);
      setLoading(false);
    })();
  }, [id]);

  const totalSize = useMemo(() => files.reduce((s, f) => s + (f.size_bytes || 0), 0), [files]);
  const activeIdx = useMemo(() => {
    if (!order) return -1;
    if (order.status === "cancelled") return -1;
    return TIMELINE.findIndex((t) => t.key === order.status);
  }, [order]);

  const downloadFile = async (f: FileRow) => {
    setDownloadingId(f.id);
    const { data, error } = await supabase.storage.from("trial-uploads").createSignedUrl(f.storage_path, 60, { download: f.original_filename });
    setDownloadingId(null);
    if (error || !data?.signedUrl) { toast.error("Erro ao gerar link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const copyNumber = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.order_number);
    toast.success("Número copiado");
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!order) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Pedido não encontrado.</p>
        <Button asChild variant="outline"><Link to="/portal/app/pedidos"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link></Button>
      </div>
    );
  }

  const langLabel = order.language_pair === "pt-it" ? "Português → Italiano" : "Italiano → Português";
  const langShort = order.language_pair === "pt-it" ? "PT → IT" : "IT → PT";
  const createdFull = new Date(order.created_at).toLocaleString("pt-BR");
  const submittedFull = order.submitted_at ? new Date(order.submitted_at).toLocaleString("pt-BR") : null;
  const updatedFull = new Date(order.updated_at).toLocaleString("pt-BR");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/portal/app/pedidos"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar para pedidos</Link>
      </Button>

      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" /> Protocolo
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{order.order_number}</h1>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyNumber}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Criado em {createdFull}</span>
              {submittedFull && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Enviado em {submittedFull}</span>}
            </div>
          </div>
          <Badge variant={statusVariant[order.status] ?? "default"} className="text-sm px-3 py-1.5">
            {statusLabels[order.status] ?? order.status}
          </Badge>
        </div>

        {/* Timeline */}
        {order.status !== "cancelled" && (
          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TIMELINE.map((step, i) => {
                const done = i < activeIdx;
                const current = i === activeIdx;
                return (
                  <div key={step.key} className="flex items-start gap-2">
                    <div className={cn(
                      "shrink-0 mt-0.5",
                      done ? "text-primary" : current ? "text-primary" : "text-muted-foreground/40",
                    )}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : current ? <CircleDot className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className={cn("text-sm font-medium", !done && !current && "text-muted-foreground")}>{step.label}</div>
                      <div className="text-xs text-muted-foreground">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Files} label="Documentos" value={order.total_documents || files.length} sub={formatBytes(totalSize)} />
        <StatCard icon={BookOpen} label="Páginas" value={order.total_pages} />
        <StatCard icon={TypeIcon} label="Caracteres" value={order.total_characters.toLocaleString("pt-BR")} />
        <StatCard icon={Languages} label="Idioma" value={langShort} sub="Juramentada" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order details */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Detalhes do pedido</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Languages className="h-3.5 w-3.5" /> Par de idioma</div>
                <div className="font-medium">{langLabel}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5"><FileSignature className="h-3.5 w-3.5" /> Tipo de tradução</div>
                <div className="font-medium capitalize">{order.translation_type}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Criado em</div>
                <div className="font-medium">{createdFull}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Última atualização</div>
                <div className="font-medium">{updatedFull}</div>
              </div>
            </div>
            {order.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Observações</div>
                  <div className="rounded-md bg-muted/40 p-3 text-sm whitespace-pre-wrap">{order.notes}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Customer */}
        <Card>
          <CardHeader><CardTitle className="text-base">Solicitante</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customer ? (
              <>
                <div className="flex items-start gap-2"><User className="h-4 w-4 text-muted-foreground mt-0.5" /><div><div className="text-xs text-muted-foreground">Nome</div><div className="font-medium">{customer.full_name}</div></div></div>
                <div className="flex items-start gap-2"><Mail className="h-4 w-4 text-muted-foreground mt-0.5" /><div className="min-w-0"><div className="text-xs text-muted-foreground">E-mail</div><div className="font-medium truncate">{customer.email}</div></div></div>
                {customer.phone && <div className="flex items-start gap-2"><Phone className="h-4 w-4 text-muted-foreground mt-0.5" /><div><div className="text-xs text-muted-foreground">Telefone</div><div className="font-medium">{customer.phone}</div></div></div>}
                {customer.company && <div className="flex items-start gap-2"><Building2 className="h-4 w-4 text-muted-foreground mt-0.5" /><div><div className="text-xs text-muted-foreground">Empresa</div><div className="font-medium">{customer.company}</div></div></div>}
                {customer.cpf_cnpj && <div className="flex items-start gap-2"><IdCard className="h-4 w-4 text-muted-foreground mt-0.5" /><div><div className="text-xs text-muted-foreground">CPF/CNPJ</div><div className="font-medium">{customer.cpf_cnpj}</div></div></div>}
              </>
            ) : (
              <p className="text-muted-foreground">Dados do solicitante indisponíveis.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Files */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Arquivos ({files.length})</span>
            <span className="text-xs font-normal text-muted-foreground">Total: {formatBytes(totalSize)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum arquivo neste pedido.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-right">Páginas</TableHead>
                    <TableHead className="text-right">Caracteres</TableHead>
                    <TableHead className="text-right">Tamanho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-xs">{f.original_filename}</div>
                            <div className="text-xs text-muted-foreground">{f.mime_type}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{f.pages || "—"}</TableCell>
                      <TableCell className="text-right">{f.characters ? f.characters.toLocaleString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-right">{formatBytes(f.size_bytes)}</TableCell>
                      <TableCell>
                        {f.analysis_status === "done" && <Badge variant="outline" className="text-primary border-primary/30">Analisado</Badge>}
                        {f.analysis_status === "pending" && <Badge variant="outline">Analisando</Badge>}
                        {f.analysis_status === "failed" && <Badge variant="destructive">Falha</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => downloadFile(f)} disabled={downloadingId === f.id}>
                          {downloadingId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PortalOrderDetail() {
  return <OrderDetailInner />;
}
