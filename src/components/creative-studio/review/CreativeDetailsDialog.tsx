import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { CreativeStatusBadge } from "@/components/creative-studio/review/CreativeStatusBadge";

type CreativeRow = Database["public"]["Tables"]["creatives"]["Row"];
type CreativeStatus = Database["public"]["Enums"]["creative_status"];

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}

export function CreativeDetailsDialog({
  open,
  onOpenChange,
  creative,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  creative: CreativeRow | null;
  onUpdated: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const bullets = useMemo(() => toStringArray(creative?.concept_bullets), [creative?.concept_bullets]);
  const hashtags = useMemo(() => toStringArray(creative?.hashtags), [creative?.hashtags]);

  const status = (creative?.status ?? "generated") as CreativeStatus;
  const canReject = status !== "approved";

  const updateStatus = async (nextStatus: CreativeStatus) => {
    if (!creative) return;
    setIsSaving(true);
    try {
      const updatePayload: Database["public"]["Tables"]["creatives"]["Update"] = {
        status: nextStatus,
      };
      if (feedback.trim()) updatePayload.feedback = feedback.trim();

      const { error } = await supabase
        .from("creatives")
        .update(updatePayload)
        .eq("id", creative.id);

      if (error) throw error;

      toast({
        title: nextStatus === "approved" ? "Criativo aprovado" : "Criativo reprovado",
      });
      setFeedback("");
      await onUpdated();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({
        title: "Falha ao atualizar",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{creative?.concept_headline || "Detalhes do criativo"}</span>
            {creative?.status && <CreativeStatusBadge status={creative.status} />}
          </DialogTitle>
          <DialogDescription>
            {creative?.concept_subheadline || "Revise o texto, legenda e hashtags antes de aprovar."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {bullets.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Pontos-chave</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Legenda</p>
              <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                {creative?.caption || "(sem legenda)"}
              </pre>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Hashtags</p>
              {hashtags.length === 0 ? (
                <p className="text-sm text-muted-foreground">(sem hashtags)</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((h, i) => (
                    <span key={i} className="text-xs rounded-full border px-2 py-1">
                      {h.startsWith("#") ? h : `#${h}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (opcional)</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Ex: trocar o CTA, reduzir o tom, focar no benefício X"
                rows={5}
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => updateStatus("rejected")}
            disabled={isSaving || !creative || !canReject}
          >
            Reprovar
          </Button>
          <Button onClick={() => updateStatus("approved")} disabled={isSaving || !creative}>
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
