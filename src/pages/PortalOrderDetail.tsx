import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, ExternalLink, Download, FileText, ArrowLeft, Upload, Trash2, Link2, Hash, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  processing_step: number | null;
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

type FileRow = {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  pages: number | null;
  characters: number | null;
  kind?: string | null;
  source_file_id?: string | null;
};

import { STATUS_LABEL, STATUS_VARIANT, PROCESSING_STEPS, PROCESSING_TOTAL } from "@/portal/lib/orderStatus";
const STATUS_OPTIONS = ["draft", "submitted", "accepted", "processing", "completed", "delivered", "received", "cancelled"];
const MAX_PDF_BYTES = 50 * 1024 * 1024;

const statusVariant = (s: string) => STATUS_VARIANT[s] ?? "outline";
const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

const formatBytes = (n: number | null) => {
  if (!n) return "-";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

export default function PortalOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const { mainContainerClass } = usePageLayout();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string | null } | null>(null);
  const [externalLink, setExternalLink] = useState("");
  const [externalId, setExternalId] = useState("");
  const [savingRefs, setSavingRefs] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const canEditRefs = userRole === "owner" || userRole === "master";

  const sourceFiles = files.filter((f) => (f.kind ?? "source") === "source");
  const translationFiles = files.filter((f) => f.kind === "translation");
  const orphanTranslations = translationFiles.filter((t) => !t.source_file_id);
  const translationsBySource = translationFiles.reduce<Record<string, FileRow[]>>((acc, t) => {
    if (t.source_file_id) (acc[t.source_file_id] ||= []).push(t);
    return acc;
  }, {});

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [orderRes, filesRes] = await Promise.all([
      supabase
        .from("trial_orders")
        .select("*, trial_customers(id, full_name, email, phone, company, cpf_cnpj)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("trial_order_files")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true }),
    ]);
    if (orderRes.error) {
      toast({ title: "Erro ao carregar pedido", description: orderRes.error.message, variant: "destructive" });
    } else {
      const o = (orderRes.data ?? null) as unknown as OrderRow | null;
      setOrder(o);
      setExternalLink(o?.external_link ?? "");
      setExternalId(o?.external_id ?? "");
    }
    if (filesRes.error) {
      toast({ title: "Erro ao carregar arquivos", description: filesRes.error.message, variant: "destructive" });
    } else {
      setFiles((filesRes.data ?? []) as FileRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("trial_orders")
      .update({ status: newStatus as any })
      .eq("id", order.id);
    setUpdatingStatus(false);
    if (error) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status atualizado" });
    setOrder({ ...order, status: newStatus });
  };

  const runRpc = async (fn: string, params: Record<string, any>, successMsg: string) => {
    if (!order) return;
    setUpdatingStatus(true);
    const { error } = await supabase.rpc(fn as any, params);
    setUpdatingStatus(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: successMsg });
    await load();
  };
  const acceptOrder = () => runRpc("accept_trial_order", { p_order_id: order!.id }, "Pedido aceito");
  const startProcessing = () => runRpc("start_trial_order_processing", { p_order_id: order!.id }, "Processamento iniciado");
  const advanceStep = () => runRpc("advance_trial_order_processing", { p_order_id: order!.id }, "Etapa avançada");
  const setStep = (step: number) => runRpc("set_trial_order_processing_step", { p_order_id: order!.id, p_step: step }, "Etapa atualizada");
  const markDelivered = () => runRpc("mark_trial_order_delivered", { p_order_id: order!.id }, "Pedido entregue");

  const saveRefs = async () => {
    if (!order) return;
    const link = externalLink.trim();
    if (link && !/^https?:\/\//i.test(link)) {
      toast({ title: "Link inválido", description: "Use uma URL iniciando com http:// ou https://", variant: "destructive" });
      return;
    }
    if (link.length > 2000 || externalId.trim().length > 200) {
      toast({ title: "Tamanho excedido", description: "Link até 2000 e ID até 200 caracteres.", variant: "destructive" });
      return;
    }
    setSavingRefs(true);
    const { error } = await supabase
      .from("trial_orders")
      .update({ external_link: link || null, external_id: externalId.trim() || null } as any)
      .eq("id", order.id);
    setSavingRefs(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Referências salvas" });
    setOrder({ ...order, external_link: link || null, external_id: externalId.trim() || null });
  };

  const previewFile = async (f: FileRow) => {
    const { data, error } = await supabase.storage
      .from("trial-uploads")
      .createSignedUrl(f.storage_path, 600);
    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao gerar pré-visualização", description: error?.message ?? "Falha", variant: "destructive" });
      return;
    }
    setPreview({ url: data.signedUrl, name: f.original_filename, mime: f.mime_type });
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

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    sourceFileId: string | null,
  ) => {
    const file = e.target.files?.[0];
    if (file) await uploadTranslation(file, sourceFileId);
    e.target.value = "";
  };

  const uploadTranslation = async (file: File, sourceFileId: string | null) => {
    if (!order) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast({ title: "Arquivo inválido", description: "Envie apenas arquivos PDF.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Tamanho máximo: 50MB.", variant: "destructive" });
      return;
    }
    setUploadingFor(sourceFileId ?? "__orphan__");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `translations/${order.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("trial-uploads")
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    if (upErr) {
      setUploadingFor(null);
      toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
      return;
    }
    const { error: insErr } = await supabase.from("trial_order_files").insert({
      order_id: order.id,
      storage_path: path,
      original_filename: file.name,
      mime_type: "application/pdf",
      size_bytes: file.size,
      kind: "translation",
      source_file_id: sourceFileId,
    } as any);
    setUploadingFor(null);
    if (insErr) {
      await supabase.storage.from("trial-uploads").remove([path]);
      toast({ title: "Erro ao salvar registro", description: insErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tradução enviada" });
    load();
  };

  const removeTranslation = async (f: FileRow) => {
    if (!confirm(`Remover "${f.original_filename}"?`)) return;
    const { error: delDb } = await supabase.from("trial_order_files").delete().eq("id", f.id);
    if (delDb) {
      toast({ title: "Erro ao remover", description: delDb.message, variant: "destructive" });
      return;
    }
    await supabase.storage.from("trial-uploads").remove([f.storage_path]);
    toast({ title: "Tradução removida" });
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole || ""} />
      <div className={mainContainerClass}>
        <Header userName={user?.email || ""} userRole={userRole || ""} />
        <main className="p-4 md:p-6 lg:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/portal-orders")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {loading ? "Carregando..." : order ? `Pedido ${order.order_number}` : "Pedido não encontrado"}
              </h1>
              {order && (
                <p className="text-muted-foreground text-sm">
                  Criado em {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !order ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Pedido não encontrado.</CardContent></Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Nome:</span> {order.trial_customers?.full_name ?? "-"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {order.trial_customers?.email ?? "-"}</div>
                  <div><span className="text-muted-foreground">Telefone:</span> {order.trial_customers?.phone ?? "-"}</div>
                  <div><span className="text-muted-foreground">Empresa:</span> {order.trial_customers?.company ?? "-"}</div>
                  <div><span className="text-muted-foreground">CPF/CNPJ:</span> {order.trial_customers?.cpf_cnpj ?? "-"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Pedido</span>
                    <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Idioma:</span> {order.language_pair ?? "-"}</div>
                  <div><span className="text-muted-foreground">Tipo:</span> {order.translation_type ?? "-"}</div>
                  <div><span className="text-muted-foreground">Documentos:</span> {order.total_documents ?? 0}</div>
                  <div><span className="text-muted-foreground">Páginas:</span> {order.total_pages ?? 0}</div>
                  <div><span className="text-muted-foreground">Caracteres:</span> {order.total_characters ?? 0}</div>
                  {order.submitted_at && (
                    <div><span className="text-muted-foreground">Enviado em:</span> {format(new Date(order.submitted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                  )}
                  {order.notes && (
                    <div className="pt-2"><span className="text-muted-foreground">Observações:</span> {order.notes}</div>
                  )}
                  <div className="pt-3 border-t mt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Status atual:</span>
                      <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
                      {updatingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>

                    {/* Owner workflow controls */}
                    <div className="flex flex-wrap gap-2">
                      {order.status === "submitted" && (
                        <Button size="sm" onClick={acceptOrder} disabled={updatingStatus}>Aceitar pedido</Button>
                      )}
                      {order.status === "accepted" && (
                        <Button size="sm" onClick={startProcessing} disabled={updatingStatus}>Iniciar processamento</Button>
                      )}
                      {order.status === "processing" && (
                        <>
                          <Button size="sm" onClick={advanceStep} disabled={updatingStatus}>
                            {(order.processing_step ?? 1) >= PROCESSING_TOTAL ? "Finalizar" : "Avançar etapa"}
                          </Button>
                        </>
                      )}
                      {(order.status === "completed" || order.status === "processing") && (
                        <Button size="sm" variant="outline" onClick={markDelivered} disabled={updatingStatus}>
                          Marcar como entregue
                        </Button>
                      )}
                    </div>

                    {order.status === "processing" && (
                      <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Sub-etapa interna ({Math.min(order.processing_step ?? 1, PROCESSING_TOTAL)}/{PROCESSING_TOTAL}) — não visível ao cliente
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {PROCESSING_STEPS.map((name, idx) => {
                            const step = idx + 1;
                            const current = step === (order.processing_step ?? 1);
                            const done = step < (order.processing_step ?? 1);
                            return (
                              <button
                                key={name}
                                type="button"
                                onClick={() => setStep(step)}
                                disabled={updatingStatus}
                                className={
                                  "text-left text-xs rounded px-2 py-1.5 border transition-colors " +
                                  (current
                                    ? "border-primary bg-primary/10 text-primary font-medium"
                                    : done
                                    ? "border-transparent bg-muted text-muted-foreground line-through"
                                    : "border-border hover:bg-muted")
                                }
                              >
                                {step}. {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fallback: legacy raw status changer */}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Alterar status manualmente</summary>
                      <div className="flex items-center gap-2 mt-2">
                        <Select value={order.status} onValueChange={updateStatus} disabled={updatingStatus}>
                          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </details>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Referências externas</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Vincule um link externo e um identificador a este pedido.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="external_link" className="flex items-center gap-2 text-sm">
                      <Link2 className="h-4 w-4" /> Link
                    </Label>
                    <Input
                      id="external_link"
                      type="url"
                      placeholder="https://..."
                      value={externalLink}
                      onChange={(e) => setExternalLink(e.target.value)}
                      disabled={!canEditRefs || savingRefs}
                      maxLength={2000}
                    />
                    {order.external_link && (
                      <a href={order.external_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 break-all">
                        <ExternalLink className="h-3 w-3" /> {order.external_link}
                      </a>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="external_id" className="flex items-center gap-2 text-sm">
                      <Hash className="h-4 w-4" /> ID
                    </Label>
                    <Input
                      id="external_id"
                      placeholder="Identificador..."
                      value={externalId}
                      onChange={(e) => setExternalId(e.target.value)}
                      disabled={!canEditRefs || savingRefs}
                      maxLength={200}
                    />
                  </div>
                  {canEditRefs && (
                    <div className="md:col-span-2 flex justify-end">
                      <Button onClick={saveRefs} disabled={savingRefs} size="sm">
                        {savingRefs ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                        Salvar referências
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Documentos e traduções</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Envie o PDF da tradução vinculado ao documento original correspondente.
                  </p>
                </CardHeader>
                <CardContent>
                  {sourceFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p>
                  ) : (
                    <div className="space-y-4">
                      {sourceFiles.map((f) => {
                        const related = translationsBySource[f.id] ?? [];
                        const isUploading = uploadingFor === f.id;
                        return (
                          <div key={f.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div className="font-medium text-sm truncate">{f.original_filename}</div>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Original · {f.mime_type ?? "?"} · {formatBytes(f.size_bytes)} · {f.pages ?? 0} pgs · {f.characters ?? 0} chars
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="outline" onClick={() => previewFile(f)} title="Visualizar"><Eye className="h-4 w-4" /></Button>
                                <Button size="sm" variant="outline" onClick={() => openFile(f.storage_path)} title="Abrir em nova aba"><ExternalLink className="h-4 w-4" /></Button>
                                <Button size="sm" variant="outline" onClick={() => downloadFile(f.storage_path, f.original_filename)} title="Baixar"><Download className="h-4 w-4" /></Button>
                              </div>
                            </div>

                            <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Tradução (PDF)
                                </span>
                                <input
                                  ref={(el) => { fileInputRefs.current[f.id] = el; }}
                                  type="file"
                                  accept="application/pdf,.pdf"
                                  className="hidden"
                                  onChange={(e) => handleUpload(e, f.id)}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fileInputRefs.current[f.id]?.click()}
                                  disabled={isUploading}
                                >
                                  {isUploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                                  Enviar tradução
                                </Button>
                              </div>
                              {related.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Nenhuma tradução vinculada.</p>
                              ) : (
                                related.map((t) => (
                                  <div key={t.id} className="border rounded-md p-2 flex items-center justify-between gap-3 bg-muted/30">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                                        <div className="font-medium text-sm truncate">{t.original_filename}</div>
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {formatBytes(t.size_bytes)}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Button size="sm" variant="outline" onClick={() => previewFile(t)} title="Visualizar"><Eye className="h-4 w-4" /></Button>
                                      <Button size="sm" variant="outline" onClick={() => openFile(t.storage_path)} title="Abrir em nova aba"><ExternalLink className="h-4 w-4" /></Button>
                                      <Button size="sm" variant="outline" onClick={() => downloadFile(t.storage_path, t.original_filename)} title="Baixar"><Download className="h-4 w-4" /></Button>
                                      <Button size="sm" variant="outline" onClick={() => removeTranslation(t)} title="Remover"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {orphanTranslations.length > 0 && (
                    <div className="mt-6 pt-4 border-t space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Traduções sem documento vinculado
                      </div>
                      {orphanTranslations.map((t) => (
                        <div key={t.id} className="border rounded-md p-2 flex items-center justify-between gap-3 bg-muted/30">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-primary" />
                              <div className="font-medium text-sm truncate">{t.original_filename}</div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{formatBytes(t.size_bytes)}</div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => previewFile(t)} title="Visualizar"><Eye className="h-4 w-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => openFile(t.storage_path)} title="Abrir em nova aba"><ExternalLink className="h-4 w-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => downloadFile(t.storage_path, t.original_filename)} title="Baixar"><Download className="h-4 w-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => removeTranslation(t)} title="Remover"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}

          <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="truncate">{preview?.name}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden bg-muted/30">
                {preview && (() => {
                  const mime = preview.mime ?? "";
                  const ext = preview.name.split(".").pop()?.toLowerCase() ?? "";
                  const isImage = mime.startsWith("image/") || ["png","jpg","jpeg","gif","webp","svg"].includes(ext);
                  const isPdf = mime === "application/pdf" || ext === "pdf";
                  const isOffice = ["doc","docx","xls","xlsx","ppt","pptx"].includes(ext);
                  if (isImage) return <img src={preview.url} alt={preview.name} className="w-full h-full object-contain" />;
                  if (isPdf) return <iframe src={preview.url} className="w-full h-full border-0" title={preview.name} />;
                  if (isOffice) {
                    const viewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(preview.url)}`;
                    return <iframe src={viewer} className="w-full h-full border-0" title={preview.name} />;
                  }
                  return (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Pré-visualização não disponível para este tipo de arquivo.</p>
                      <Button variant="outline" onClick={() => window.open(preview.url, "_blank", "noopener,noreferrer")}>
                        <ExternalLink className="h-4 w-4 mr-2" /> Abrir em nova aba
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
