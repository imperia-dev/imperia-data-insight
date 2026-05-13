import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PortalLayout } from "../PortalLayout";
import { TrialPortalGuard, useTrialCustomer } from "../TrialPortalGuard";

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

function NewOrderInner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customer } = useTrialCustomer();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [languagePair, setLanguagePair] = useState<"pt-it" | "it-pt">("pt-it");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<FileRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Create draft order on mount
  useEffect(() => {
    if (!customer || orderId || creating) return;
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
  }, [customer, orderId, creating, languagePair]);

  // Update language on draft
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
    setUploading(true);
    for (const file of Array.from(selected)) {
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
      // Trigger analysis (don't await all in sequence — fire and forget)
      supabase.functions.invoke("analyze-trial-document", { body: { file_id: row.id } }).then(() => refreshFiles(orderId));
    }
    await refreshFiles(orderId);
    setUploading(false);
  };

  // Poll for pending files
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

  const canSubmit = orderId && files.length > 0 && files.every((f) => f.analysis_status !== "pending") && !submitting;

  const submit = async () => {
    if (!orderId) return;
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("submit-trial-order", { body: { order_id: orderId, notes } });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar pedido", { description: error.message });
      return;
    }
    toast.success("Pedido enviado!");
    navigate(`/portal/app/pedido/${orderId}`, { replace: true });
  };

  return (
    <PortalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Novo pedido</h1>
          <p className="text-muted-foreground">Tradução juramentada PT ↔ IT.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>1. Par de idioma</CardTitle></CardHeader>
          <CardContent>
            <RadioGroup value={languagePair} onValueChange={(v) => setLanguagePair(v as "pt-it" | "it-pt")} className="grid gap-3 md:grid-cols-2">
              <Label className="flex items-center gap-3 border rounded-md p-4 cursor-pointer hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="pt-it" />
                <span className="font-medium">Português → Italiano</span>
              </Label>
              <Label className="flex items-center gap-3 border rounded-md p-4 cursor-pointer hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="it-pt" />
                <span className="font-medium">Italiano → Português</span>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Tipo de tradução</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-md p-4 bg-muted/20">
              <span className="font-medium">Juramentada</span>
              <p className="text-sm text-muted-foreground mt-1">Tradução com fé pública para fins oficiais.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>3. Arquivos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/30">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="font-medium">Selecionar arquivos</span>
              <span className="text-xs text-muted-foreground">PDF, DOCX, XLSX, PNG, JPG — até 20MB cada</span>
              <input type="file" multiple accept={ACCEPTED} className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={!orderId || uploading} />
            </label>
            {(uploading || creating) && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
              </p>
            )}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 border rounded-md p-3 text-sm">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{f.original_filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.analysis_status === "pending" && "Analisando..."}
                        {f.analysis_status === "done" && `${f.pages} págs · ${f.characters.toLocaleString("pt-BR")} caracteres`}
                        {f.analysis_status === "failed" && (f.analysis_error || "Falha na análise")}
                      </div>
                    </div>
                    {f.analysis_status === "pending" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {f.analysis_status === "done" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    {f.analysis_status === "failed" && <AlertCircle className="h-4 w-4 text-destructive" />}
                    <Button variant="ghost" size="icon" onClick={() => removeFile(f)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <div className="rounded-md bg-muted/30 p-3 text-sm flex justify-between">
                  <span><strong>{totals.docs}</strong> documentos</span>
                  <span><strong>{totals.pages}</strong> páginas</span>
                  <span><strong>{totals.chars.toLocaleString("pt-BR")}</strong> caracteres</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>4. Observações (opcional)</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={4} placeholder="Algo importante sobre o pedido?" />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/portal/app")}>Cancelar</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar pedido
          </Button>
        </div>
      </div>
    </PortalLayout>
  );
}

export default function PortalNewOrder() {
  return <TrialPortalGuard><NewOrderInner /></TrialPortalGuard>;
}
