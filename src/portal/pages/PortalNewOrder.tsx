import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, Upload, X, FileText, CheckCircle2, AlertCircle, Check,
  Languages, FileSignature, FolderUp, ListChecks, DollarSign, CreditCard, Send,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTrialCustomer } from "../TrialPortalGuard";
import { useTrialUsage } from "../lib/useTrialUsage";
import { cn } from "@/lib/utils";


type FileRow = {
  id: string;
  original_filename: string;
  size_bytes: number;
  pages: number;
  characters: number;
  analysis_status: "pending" | "done" | "failed";
  analysis_error: string | null;
};

const ACCEPTED = ".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.webp";
const MAX_SIZE = 20 * 1024 * 1024;

type StepId = "idioma" | "tipo" | "arquivos" | "dados" | "preco" | "pagamento" | "revisao";

const STEPS: { id: StepId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "idioma", label: "Par de idioma", icon: Languages },
  { id: "tipo", label: "Tipo de tradução", icon: FileSignature },
  { id: "arquivos", label: "Arquivos", icon: FolderUp },
  { id: "dados", label: "Dados dos arquivos", icon: ListChecks },
  { id: "preco", label: "Preço", icon: DollarSign },
  { id: "pagamento", label: "Pagamento", icon: CreditCard },
  { id: "revisao", label: "Revisão e envio", icon: Send },
];

function NewOrderInner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customer } = useTrialCustomer();
  const { usage, refresh: refreshUsage } = useTrialUsage(customer?.id);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [languagePair, setLanguagePair] = useState<"pt-it" | "it-pt">("pt-it");
  const [notes, setNotes] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [files, setFiles] = useState<FileRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<StepId>("idioma");

  const docLimit = usage?.docs_limit ?? 10;
  const pagesLimit = usage?.pages_limit ?? 30;
  const multiDocPageLimit = usage?.pages_per_doc_limit ?? 3;
  const singleDocPageLimit = usage?.single_doc_pages_limit ?? 30;
  const docsUsed = usage?.docs_used ?? 0;
  const pagesUsed = usage?.pages_used ?? 0;
  const remainingDocs = Math.max(docLimit - docsUsed, 0);
  const remainingPages = Math.max(pagesLimit - pagesUsed, 0);
  const docsAfter = docsUsed + files.length;
  const perDocCap = docsAfter <= 1 ? singleDocPageLimit : multiDocPageLimit;
  const overLimitCount = files.filter((f) => (f.pages ?? 0) > perDocCap).length;
  const pagesInOrder = files.reduce((s, f) => s + (f.pages ?? 0), 0);
  const wouldExceedDocs = files.length > remainingDocs;
  const wouldExceedPages = pagesInOrder > remainingPages;
  const wouldExceed = wouldExceedDocs || wouldExceedPages;
  const trialBlocked = usage?.blocked === true;



  useEffect(() => {
    if (!customer || orderId || creating) return;
    if (usage === null) return; // wait for usage to load
    if (trialBlocked) return; // do not create a draft if blocked
    setCreating(true);
    (async () => {
      const { data: numberData } = await supabase.rpc("generate_trial_order_number");
      const { data, error } = await supabase
        .from("trial_orders")
        .insert({
          customer_id: customer.id,
          order_number: numberData as string,
          language_pair: languagePair,
          translation_type: "juramentada",
          status: "draft",
        })
        .select("id")
        .single();
      setCreating(false);
      if (error) {
        toast.error("Erro ao iniciar pedido", { description: error.message });
        return;
      }
      setOrderId(data.id);
    })();
  }, [customer, orderId, creating, languagePair, usage, trialBlocked]);


  useEffect(() => {
    if (!orderId) return;
    supabase.from("trial_orders").update({ language_pair: languagePair }).eq("id", orderId);
  }, [languagePair, orderId]);

  const refreshFiles = async (oid: string) => {
    const { data } = await supabase.from("trial_order_files").select("*").eq("order_id", oid).order("created_at");
    setFiles((data as FileRow[]) ?? []);
  };

  const handleFiles = async (selected: FileList | null) => {
    if (!selected || !orderId || !user) return;
    const incoming = Array.from(selected);
    const slotsLeft = Math.max(remainingDocs - files.length, 0);
    if (slotsLeft <= 0) {
      toast.error("Limite do trial atingido", {
        description: `Você só pode incluir ${docLimit} documentos no total durante o trial.`,
      });
      return;
    }
    const toUpload = incoming.slice(0, slotsLeft);
    if (toUpload.length < incoming.length) {
      toast.warning(`Apenas ${toUpload.length} arquivo(s) serão enviados`, {
        description: `Restam ${slotsLeft} documento(s) no seu trial.`,

      });
    }
    setUploading(true);
    for (const file of toUpload) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} excede 20MB`);
        continue;
      }
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${orderId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("trial-uploads").upload(path, file, { contentType: file.type });
      if (upErr) {
        toast.error(`Erro no upload de ${file.name}`, { description: upErr.message });
        continue;
      }
      const { data: row, error: insErr } = await supabase
        .from("trial_order_files")
        .insert({
          order_id: orderId,
          storage_path: path,
          original_filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        })
        .select("id")
        .single();
      if (insErr || !row) {
        toast.error(`Erro ao registrar ${file.name}`);
        continue;
      }
      supabase.functions.invoke("analyze-trial-document", { body: { file_id: row.id } }).then(() => refreshFiles(orderId));
    }
    await refreshFiles(orderId);
    setUploading(false);
  };


  useEffect(() => {
    if (!orderId) return;
    const hasPending = files.some((f) => f.analysis_status === "pending");
    if (!hasPending) return;
    const t = setInterval(() => refreshFiles(orderId), 3000);
    return () => clearInterval(t);
  }, [orderId, files]);

  const removeFile = async (file: FileRow) => {
    if (!orderId) return;
    await supabase.from("trial_order_files").delete().eq("id", file.id);
    await refreshFiles(orderId);
  };

  const totals = files.reduce(
    (acc, f) => ({ docs: acc.docs + 1, pages: acc.pages + (f.pages || 0), chars: acc.chars + (f.characters || 0) }),
    { docs: 0, pages: 0, chars: 0 },
  );

  const canSubmit =
    !!orderId &&
    files.length > 0 &&
    files.every((f) => f.analysis_status !== "pending") &&
    overLimitCount === 0 &&
    !wouldExceed &&
    !trialBlocked &&
    !submitting;

  const completion: Record<StepId, boolean> = useMemo(() => ({
    idioma: true,
    tipo: true,
    arquivos: files.length > 0,
    dados: files.length > 0 && files.every((f) => f.analysis_status === "done"),
    preco: false,
    pagamento: false,
    revisao: false,
  }), [files]);

  const submit = async () => {
    if (!orderId) return;
    setSubmitting(true);
    const ref = customerReference.trim();
    if (ref) {
      await supabase.from("trial_orders").update({ customer_reference: ref.slice(0, 120) }).eq("id", orderId);
    }
    const { data, error } = await supabase.functions.invoke("submit-trial-order", { body: { order_id: orderId, notes } });
    setSubmitting(false);
    const payload = (data ?? {}) as { error?: string; message?: string };
    if (error || payload.error) {
      toast.error("Erro ao enviar pedido", { description: payload.message || error?.message || "Tente novamente." });
      refreshUsage();
      return;
    }
    toast.success("Pedido enviado!");
    refreshUsage();
    navigate(`/portal/app/pedido/${orderId}`, { replace: true });
  };


  const idx = STEPS.findIndex((s) => s.id === step);
  const goPrev = () => idx > 0 && setStep(STEPS[idx - 1].id);
  const goNext = () => idx < STEPS.length - 1 && setStep(STEPS[idx + 1].id);

  const langLabel = "Tradução juramentada Português → Italiano";

  if (trialBlocked) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle>Limite do período trial atingido</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Você já enviou {docsUsed} de {docLimit} documentos permitidos no período de testes.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Não é possível criar novos pedidos no momento. Os pedidos já em andamento continuarão normalmente
              até a entrega.
            </p>
            <p className="text-sm text-muted-foreground">
              Precisa enviar mais documentos? Entre em contato com a nossa equipe para liberar volume adicional.
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate("/portal/app/pedidos")}>Ver meus pedidos</Button>
              <Button asChild>
                <a href="mailto:contato@imperiatraducoes.com.br?subject=Aumentar%20limite%20do%20trial">Falar com a equipe</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="portal-new-order max-w-5xl mx-auto space-y-10">
      <style>{`.portal-new-order h3{font-family:'Playfair Display',serif;font-style:italic;font-weight:600;letter-spacing:-0.01em}`}</style>
      <header className="space-y-2 border-l-4 border-slate-900 pl-6">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
          Novo pedido
        </h1>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em]">
          Tradução juramentada PT ↔ IT
        </p>
      </header>

      {usage && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span>
              Trial: <strong>{docsUsed}/{docLimit}</strong> docs · <strong>{pagesUsed}/{pagesLimit}</strong> págs.{" "}
              <span className="text-muted-foreground">
                Até {docLimit} documentos de {multiDocPageLimit} páginas <em>ou</em> 1 único documento de até {singleDocPageLimit} páginas.
              </span>
            </span>
          </div>
          {(overLimitCount > 0 || wouldExceed) && (
            <span className="text-xs font-semibold text-destructive shrink-0">
              {overLimitCount > 0 && `${overLimitCount} arquivo(s) acima de ${perDocCap} págs`}
              {overLimitCount > 0 && wouldExceed && " · "}
              {wouldExceedDocs && `${files.length} > ${remainingDocs} docs restantes`}
              {wouldExceedDocs && wouldExceedPages && " · "}
              {wouldExceedPages && `${pagesInOrder} > ${remainingPages} págs restantes`}
            </span>
          )}
        </div>
      )}



      <Tabs value={step} onValueChange={(v) => setStep(v as StepId)} className="space-y-6">
        <TabsList className="h-auto w-full bg-transparent p-0 flex items-center justify-between gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const done = completion[s.id];
            const active = step === s.id;
            const isLast = i === STEPS.length - 1;
            return (
              <Fragment key={s.id}>
                <TabsTrigger
                  value={s.id}
                  className="group flex-col gap-2 min-w-max px-3 py-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none relative"
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full text-xs font-bold transition-all",
                      active
                        ? "w-10 h-10 border-2 border-slate-900 bg-background text-slate-900 ring-4 ring-muted shadow-[0_0_15px_rgba(15,23,42,0.1)]"
                        : done
                          ? "w-8 h-8 bg-slate-900 text-white shadow-lg"
                          : "w-8 h-8 border border-slate-300 bg-transparent text-slate-400 opacity-60",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-tighter font-semibold whitespace-nowrap",
                      active ? "text-slate-900" : done ? "text-slate-400" : "text-slate-400 opacity-60",
                    )}
                  >
                    {s.label}
                  </span>
                  {active && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-slate-900 rounded-full" />}
                </TabsTrigger>
                {!isLast && <div className={cn("h-px flex-1 min-w-[12px]", done ? "bg-slate-200" : "bg-slate-100")} />}
              </Fragment>
            );
          })}
        </TabsList>


        <TabsContent value="idioma">
          <Card>
            <CardHeader><CardTitle>Par de idioma</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={languagePair} onValueChange={(v) => setLanguagePair(v as "pt-it")} className="grid gap-3">
                <Label className="flex items-center gap-3 border rounded-md p-4 cursor-pointer hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="pt-it" />
                  <span className="font-medium">Tradução juramentada Português → Italiano</span>
                </Label>
              </RadioGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipo">
          <Card>
            <CardHeader><CardTitle>Tipo de tradução</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 bg-muted/20">
                <span className="font-medium">Juramentada</span>
                <p className="text-sm text-muted-foreground mt-1">Tradução com fé pública para fins oficiais.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arquivos">
          <Card>
            <CardHeader><CardTitle>Arquivos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/30">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="font-medium">Selecionar arquivos</span>
                <span className="text-xs text-muted-foreground">PDF, DOCX, XLSX, PNG, JPG — até 20MB cada</span>
                <input type="file" multiple accept={ACCEPTED} className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={!orderId || uploading || files.length >= remainingDocs} />
              </label>
              {(uploading || creating) && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                </p>
              )}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f) => {
                    const over = (f.pages ?? 0) > perDocCap;
                    return (
                      <div
                        key={f.id}
                        className={cn(
                          "flex items-center gap-3 border rounded-md p-3 text-sm",
                          over && "border-destructive/40 bg-destructive/5",
                        )}
                      >
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{f.original_filename}</div>
                          <div className={cn("text-xs", over ? "text-destructive font-medium" : "text-muted-foreground")}>
                            {f.analysis_status === "pending" && "Analisando..."}
                            {f.analysis_status === "done" && (
                              over
                                ? `${f.pages} págs · acima do limite de ${pageLimit} páginas — remova este arquivo`
                                : `${f.pages} págs · ${f.characters.toLocaleString("pt-BR")} caracteres`
                            )}
                            {f.analysis_status === "failed" && (f.analysis_error || "Falha na análise")}
                          </div>
                        </div>
                        {f.analysis_status === "pending" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {f.analysis_status === "done" && !over && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        {f.analysis_status === "done" && over && <AlertCircle className="h-4 w-4 text-destructive" />}
                        {f.analysis_status === "failed" && <AlertCircle className="h-4 w-4 text-destructive" />}
                        <Button variant="ghost" size="icon" onClick={() => removeFile(f)}><X className="h-4 w-4" /></Button>
                      </div>
                    );
                  })}

                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dados">
          <Card>
            <CardHeader><CardTitle>Dados sobre os arquivos</CardTitle></CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum arquivo enviado ainda. Volte para a aba <strong>Arquivos</strong>.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arquivo</TableHead>
                        <TableHead className="text-right">Páginas</TableHead>
                        <TableHead className="text-right">Caracteres</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium max-w-xs truncate">{f.original_filename}</TableCell>
                          <TableCell className="text-right">{f.pages || "—"}</TableCell>
                          <TableCell className="text-right">{f.characters ? f.characters.toLocaleString("pt-BR") : "—"}</TableCell>
                          <TableCell>
                            {f.analysis_status === "pending" && <span className="text-muted-foreground">Analisando...</span>}
                            {f.analysis_status === "done" && <span className="text-primary">Pronto</span>}
                            {f.analysis_status === "failed" && <span className="text-destructive">Falha</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell>Total ({totals.docs} {totals.docs === 1 ? "documento" : "documentos"})</TableCell>
                        <TableCell className="text-right">{totals.pages}</TableCell>
                        <TableCell className="text-right">{totals.chars.toLocaleString("pt-BR")}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preco">
          <Card>
            <CardHeader><CardTitle>Preço</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <div className="rounded-full bg-muted p-4">
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">Em breve</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Cálculo automático de preço a partir das páginas e caracteres analisados.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamento">
          <Card>
            <CardHeader><CardTitle>Pagamento</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <div className="rounded-full bg-muted p-4">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">Em breve</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Opções de pagamento (PIX, cartão, boleto) estarão disponíveis aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisao" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Resumo do pedido</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Par de idioma</span><span className="font-medium">{langLabel}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Tipo</span><span className="font-medium">Juramentada</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Documentos</span><span className="font-medium">{totals.docs}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Páginas</span><span className="font-medium">{totals.pages}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Caracteres</span><span className="font-medium">{totals.chars.toLocaleString("pt-BR")}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sua referência (opcional)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Dê um nome ou código próprio a este pedido (ex.: nome do destinatário, número de processo). Você poderá editar depois.
              </Label>
              <Input
                value={customerReference}
                onChange={(e) => setCustomerReference(e.target.value.slice(0, 120))}
                maxLength={120}
                placeholder="Ex.: Processo João Silva 2026"
              />
              <div className="text-[11px] text-muted-foreground text-right">{customerReference.length}/120</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Observações (opcional)</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={4} placeholder="Algo importante sobre o pedido?" />
            </CardContent>
          </Card>
        </TabsContent>

        <div className="flex items-center justify-between gap-3 pt-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/portal/app")}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
          >
            Cancelar
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={idx === 0}
              className="px-8 py-3 text-sm font-semibold"
            >
              Voltar
            </Button>
            {step !== "revisao" ? (
              <Button
                onClick={goNext}
                disabled={step === "arquivos" && (overLimitCount > 0 || wouldExceed)}
                className="px-10 py-3 text-xs font-bold uppercase tracking-[0.18em] shadow-xl shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5 transition-all"
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={!canSubmit}
                className="px-10 py-3 text-xs font-bold uppercase tracking-[0.18em] shadow-xl shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5 transition-all"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar pedido
              </Button>
            )}
          </div>
        </div>

      </Tabs>
    </div>
  );
}

export default function PortalNewOrder() {
  return <NewOrderInner />;
}
