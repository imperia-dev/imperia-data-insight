import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type AttachmentAnalysis = {
  summary: string;
};

type Props = {
  disabled?: boolean;
  onAnalyzed: (analysis: AttachmentAnalysis) => void;
};

export function AttachmentPanel({ disabled, onAnalyzed }: Props) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [note, setNote] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [lastFileName, setLastFileName] = useState<string | null>(null);

  const canAnalyzeText = useMemo(() => pastedText.trim().length > 0, [pastedText]);

  const analyze = useCallback(
    async (params: { file?: File; text?: string }) => {
      setIsAnalyzing(true);
      try {
        const formData = new FormData();
        if (params.file) {
          formData.append("file", params.file);
        }
        if (params.text) {
          formData.append("text", params.text);
        }
        formData.append(
          "meta",
          JSON.stringify({
            mode: "auto",
            note: note.trim() || undefined,
          }),
        );

        const { data, error } = await supabase.functions.invoke("openai-analyze-attachment", {
          body: formData,
        });

        if (error) {
          throw error;
        }
        if (!data?.summary) {
          throw new Error("Resposta inesperada da análise");
        }

        onAnalyzed({ summary: String(data.summary) });
        toast({ title: "Anexo analisado", description: "Resumo pronto para a conversa." });
      } catch (err: any) {
        console.error("Attachment analysis failed", err);
        toast({
          variant: "destructive",
          title: "Falha ao analisar",
          description: err?.message || "Não foi possível analisar o anexo agora.",
        });
      } finally {
        setIsAnalyzing(false);
      }
    },
    [note, onAnalyzed, toast],
  );

  const onPickFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setLastFileName(file.name);
      await analyze({ file });
    },
    [analyze],
  );

  const onAnalyzeText = useCallback(async () => {
    const text = pastedText.trim();
    if (!text) return;
    setLastFileName(null);
    await analyze({ text });
  }, [analyze, pastedText]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anexos (tempo real)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Arquivo (imagem, PDF, CSV, DOC, etc.)</div>
            <input
              type="file"
              disabled={disabled || isAnalyzing}
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border file:bg-muted file:px-3 file:py-2 file:text-foreground"
            />
            {lastFileName && (
              <div className="text-xs text-muted-foreground">Último arquivo: {lastFileName}</div>
            )}
            <div className="text-xs text-muted-foreground">
              Ao selecionar, ele já analisa automaticamente e injeta na conversa.
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Texto colado</div>
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Cole aqui qualquer texto/dado para a IA considerar agora..."
              disabled={disabled || isAnalyzing}
              className="min-h-28"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">Máx ~20k caracteres (recortado).</div>
              <Button
                onClick={onAnalyzeText}
                disabled={disabled || isAnalyzing || !canAnalyzeText}
                variant="secondary"
              >
                {isAnalyzing ? "Analisando..." : "Analisar texto"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Contexto adicional (opcional)</div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: 'isso é uma nota fiscal de janeiro', 'foco em valores e datas'..."
            disabled={disabled || isAnalyzing}
            className="min-h-20"
          />
        </div>
      </CardContent>
    </Card>
  );
}
