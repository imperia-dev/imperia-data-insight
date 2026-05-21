import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, FileText, Loader2, Download, Languages, FileSignature, Files,
  BookOpen, Type as TypeIcon, Calendar, Clock, User, Mail, Phone, Building2,
  IdCard, CheckCircle2, CircleDot, Circle, AlertCircle, MessageSquare, Hash, Copy, Eye, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PreviewState = { url: string; name: string; mime: string; kind: "pdf" | "image" | "office" | "text" | "unsupported"; blobUrl?: string } | null;

function detectKind(mime: string, name: string): "pdf" | "image" | "office" | "text" | "unsupported" {
  const m = (mime || "").toLowerCase();
  const n = name.toLowerCase();
  if (m === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("text/") || n.endsWith(".txt") || n.endsWith(".csv")) return "text";
  if (/\.(docx?|xlsx?|pptx?|odt|ods|odp)$/.test(n)) return "office";
  return "unsupported";
}

type Order = {
  id: string;
  order_number: string;
  language_pair: string;
  translation_type: string;
  status: string;
  processing_step: number | null;
  total_documents: number;
  total_pages: number;
  total_characters: number;
  notes: string | null;
  submitted_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  customer_id: string;
};
type FileRow = {
  id: string; original_filename: string; pages: number; characters: number;
  analysis_status: string; size_bytes: number; mime_type: string; storage_path: string; created_at: string;
  kind: string; source_file_id: string | null;
};
type Customer = {
  id: string; full_name: string; email: string; phone: string | null;
  company: string | null; cpf_cnpj: string | null;
};

import {
  STATUS_LABEL as statusLabels,
  STATUS_VARIANT as statusVariant,
  CUSTOMER_TIMELINE as TIMELINE,
  PROCESSING_TOTAL,
  customerTimelineIndex,
} from "@/portal/lib/orderStatus";

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
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>(null);

  const reloadFiles = async (orderId: string) => {
    const { data: f } = await supabase.from("trial_order_files")
      .select("id,original_filename,pages,characters,analysis_status,size_bytes,mime_type,storage_path,created_at,kind,source_file_id")
      .eq("order_id", orderId).order("created_at");
    setFiles((f as FileRow[]) ?? []);
  };

  const reloadOrder = async (orderId: string) => {
    const { data: o } = await supabase.from("trial_orders").select("*").eq("id", orderId).maybeSingle();
    if (o) setOrder(o as Order);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: o } = await supabase.from("trial_orders").select("*").eq("id", id).maybeSingle();
      if (!o) { setLoading(false); return; }
      const [{ data: f }, { data: c }] = await Promise.all([
        supabase.from("trial_order_files")
          .select("id,original_filename,pages,characters,analysis_status,size_bytes,mime_type,storage_path,created_at,kind,source_file_id")
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

  const reanalyzeFile = async (f: FileRow) => {
    if (!order) return;
    setReanalyzingId(f.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-trial-document", {
        body: { file_id: f.id },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(`Falha na análise: ${data.error}`);
      } else {
        toast.success(`Reanalisado: ${data?.pages ?? 0} pág. / ${(data?.characters ?? 0).toLocaleString("pt-BR")} caracteres${data?.ocr_used ? " (OCR)" : ""}`);
      }
      await Promise.all([reloadFiles(order.id), reloadOrder(order.id)]);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao reanalisar arquivo");
    } finally {
      setReanalyzingId(null);
    }
  };

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

  const viewFile = async (f: FileRow) => {
    setViewingId(f.id);
    try {
      const kind = detectKind(f.mime_type, f.original_filename);
      // For Office docs, use signed URL directly with Office Online viewer (requires public-ish URL — signed URL works since Microsoft fetches server-side)
      const { data, error } = await supabase.storage
        .from("trial-uploads")
        .createSignedUrl(f.storage_path, 60 * 60);
      if (error || !data?.signedUrl) { toast.error("Erro ao gerar link"); return; }

      if (kind === "office") {
        const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.signedUrl)}`;
        setPreview({ url: officeUrl, name: f.original_filename, mime: f.mime_type, kind });
        return;
      }

      if (kind === "unsupported") {
        toast.error("Tipo de arquivo não suportado para visualização. Use o botão de download.");
        return;
      }

      // PDF / image / text — fetch as blob to avoid Content-Disposition forcing download
      const res = await fetch(data.signedUrl);
      if (!res.ok) throw new Error("fetch failed");
      const contentType = res.headers.get("content-type") || f.mime_type || "application/octet-stream";
      const blob = await res.blob();
      const typedBlob = blob.type ? blob : new Blob([blob], { type: contentType });
      const blobUrl = URL.createObjectURL(typedBlob);
      setPreview({ url: blobUrl, name: f.original_filename, mime: contentType, kind, blobUrl });
    } catch {
      toast.error("Erro ao visualizar arquivo");
    } finally {
      setViewingId(null);
    }
  };

  const closePreview = () => {
    if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);
    setPreview(null);
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

      {/* Files grouped by source document with their translations */}
      {(() => {
        const sources = files.filter((f) => f.kind !== "translation");
        const translationsBySource = files
          .filter((f) => f.kind === "translation")
          .reduce<Record<string, FileRow[]>>((acc, t) => {
            const k = t.source_file_id ?? "__orphan__";
            (acc[k] ||= []).push(t);
            return acc;
          }, {});
        const orphanTranslations = translationsBySource["__orphan__"] ?? [];

        const FileActions = ({ f }: { f: FileRow }) => (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => viewFile(f)} disabled={viewingId === f.id} title="Visualizar">
              {viewingId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => downloadFile(f)} disabled={downloadingId === f.id} title="Baixar">
              {downloadingId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
            {f.kind !== "translation" && (
              <Button variant="ghost" size="icon" onClick={() => reanalyzeFile(f)} disabled={reanalyzingId === f.id} title="Reanalisar">
                {reanalyzingId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            )}
          </div>
        );

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Documentos ({sources.length})</span>
                <span className="text-xs font-normal text-muted-foreground">Total: {formatBytes(totalSize)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sources.length === 0 && orphanTranslations.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum arquivo neste pedido.</p>
              )}

              {sources.map((src) => {
                const trs = translationsBySource[src.id] ?? [];
                return (
                  <div key={src.id} className="rounded-lg border bg-card">
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="rounded-md bg-primary/10 text-primary p-2 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Documento original</div>
                          <div className="font-medium truncate">{src.original_filename}</div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {src.pages ? <span>{src.pages} pág.</span> : null}
                            {src.characters ? <span>{src.characters.toLocaleString("pt-BR")} caracteres</span> : null}
                            <span>{formatBytes(src.size_bytes)}</span>
                            {src.analysis_status === "done" && <span className="text-primary">Analisado</span>}
                            {src.analysis_status === "pending" && <span>Analisando…</span>}
                            {src.analysis_status === "failed" && <span className="text-destructive">Falha na análise</span>}
                          </div>
                        </div>
                      </div>
                      <FileActions f={src} />
                    </div>

                    <div className="border-t bg-muted/30 px-4 py-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                        <Languages className="h-3 w-3" />
                        Tradução {trs.length > 0 && `(${trs.length})`}
                      </div>
                      {trs.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic">
                          Ainda não disponibilizada. Você será avisado quando estiver pronta.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {trs.map((t) => (
                            <div key={t.id} className="flex items-center justify-between gap-3 rounded-md bg-background border px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileSignature className="h-4 w-4 text-primary shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{t.original_filename}</div>
                                  <div className="text-[11px] text-muted-foreground">{formatBytes(t.size_bytes)}</div>
                                </div>
                              </div>
                              <FileActions f={t} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {orphanTranslations.length > 0 && (
                <div className="rounded-lg border bg-card">
                  <div className="px-4 py-2 border-b bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
                    <Languages className="h-3 w-3" /> Traduções adicionais
                  </div>
                  <div className="p-3 space-y-1.5">
                    {orphanTranslations.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-md bg-background border px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileSignature className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{t.original_filename}</div>
                            <div className="text-[11px] text-muted-foreground">{formatBytes(t.size_bytes)}</div>
                          </div>
                        </div>
                        <FileActions f={t} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) closePreview(); }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
          <DialogHeader className="px-6 py-3 border-b">
            <DialogTitle className="truncate pr-8">{preview?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted/30 overflow-hidden">
            {preview?.kind === "image" ? (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                <img src={preview.url} alt={preview.name} className="max-w-full max-h-full object-contain" />
              </div>
            ) : preview ? (
              <iframe src={preview.url} title={preview.name} className="w-full h-full border-0" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PortalOrderDetail() {
  return <OrderDetailInner />;
}
