import { useEffect, useMemo, useState } from "react";
import { StudioShell } from "@/components/creative-studio/StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Loader2, Image as ImageIcon, Film, Images, RefreshCw } from "lucide-react";

type CreativeRow = Database["public"]["Tables"]["creatives"]["Row"];
type ProviderJob = Database["public"]["Tables"]["creative_provider_jobs"]["Row"];

type MediaMode = "image" | "carousel" | "video";
type AspectRatio = "1:1" | "4:5" | "9:16";

const ASPECT_OPTIONS: Array<{ value: AspectRatio; label: string }> = [
  { value: "1:1", label: "Quadrado (1:1)" },
  { value: "4:5", label: "Feed (4:5)" },
  { value: "9:16", label: "Reels (9:16)" },
];

export default function CreativeStudioAuto() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [mediaMode, setMediaMode] = useState<MediaMode>("image");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [carouselPages, setCarouselPages] = useState(3);
  const [videoDuration, setVideoDuration] = useState(5);
  const [referenceImageUrl, setReferenceImageUrl] = useState("");

  // Creative selection
  const [creatives, setCreatives] = useState<CreativeRow[]>([]);
  const [selectedCreativeId, setSelectedCreativeId] = useState<string>("");

  // Jobs
  const [jobs, setJobs] = useState<ProviderJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  const canSubmit = useMemo(() => Boolean(activeCompanyId && user && selectedCreativeId && prompt.trim()), [activeCompanyId, user, selectedCreativeId, prompt]);

  const loadCreatives = async () => {
    if (!activeCompanyId) return;
    try {
      const { data, error } = await supabase
        .from("creatives")
        .select("id, concept_headline, caption, status, created_at, company_id, generation_id, concept_bullets, concept_subheadline, feedback, hashtags, image_path, image_url, rationale, version")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setCreatives(data ?? []);
      if (!selectedCreativeId && (data?.length ?? 0) > 0) setSelectedCreativeId(data![0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const loadJobs = async () => {
    if (!activeCompanyId) return;
    setIsLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from("creative_provider_jobs")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    void loadCreatives();
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("studio-higgsfield-submit", {
        body: {
          companyId: activeCompanyId,
          creativeId: selectedCreativeId,
          mediaMode,
          prompt: prompt.trim(),
          aspectRatio,
          carouselPages: mediaMode === "carousel" ? carouselPages : undefined,
          videoDuration: mediaMode === "video" ? videoDuration : undefined,
          referenceImageUrl: referenceImageUrl.trim() || undefined,
        },
      });

      if (error) throw error;

      toast({ title: "Geração iniciada", description: `Job ID: ${data?.jobId}` });
      setPrompt("");
      await loadJobs();
    } catch (e) {
      console.error(e);
      toast({
        title: "Falha ao iniciar geração",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePoll = async (jobId: string) => {
    setPollingJobId(jobId);
    try {
      const { data, error } = await supabase.functions.invoke("studio-higgsfield-poll", {
        body: { jobId },
      });

      if (error) throw error;

      toast({ title: `Status: ${data?.status}` });
      await loadJobs();
    } catch (e) {
      console.error(e);
      toast({
        title: "Falha ao verificar status",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setPollingJobId(null);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "text-green-600";
      case "failed": return "text-destructive";
      case "in_progress": return "text-yellow-600";
      default: return "text-muted-foreground";
    }
  };

  return (
    <StudioShell title="Auto">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gerar mídia automática (Higgsfield)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!activeCompanyId ? (
              <p className="text-sm text-muted-foreground">
                Selecione/crie uma empresa na aba <strong>Home</strong> antes de gerar.
              </p>
            ) : (
              <>
                {/* Media mode tabs */}
                <Tabs value={mediaMode} onValueChange={(v) => setMediaMode(v as MediaMode)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="image" className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" /> Imagem
                    </TabsTrigger>
                    <TabsTrigger value="carousel" className="flex items-center gap-2">
                      <Images className="h-4 w-4" /> Carrossel
                    </TabsTrigger>
                    <TabsTrigger value="video" className="flex items-center gap-2">
                      <Film className="h-4 w-4" /> Reels
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={mediaMode} className="space-y-4 pt-4">
                    {/* Prompt */}
                    <div className="space-y-2">
                      <Label htmlFor="prompt">Prompt de geração *</Label>
                      <Textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Descreva a imagem ou vídeo que deseja gerar..."
                        rows={4}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Aspect ratio */}
                      <div className="space-y-2">
                        <Label>Proporção</Label>
                        <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as AspectRatio)} disabled={isSubmitting}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {ASPECT_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Creative selection */}
                      <div className="space-y-2">
                        <Label>Criativo vinculado *</Label>
                        <Select value={selectedCreativeId} onValueChange={setSelectedCreativeId} disabled={isSubmitting || creatives.length === 0}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {creatives.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {(c.concept_headline || "(sem título)").slice(0, 50)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {creatives.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Nenhum criativo encontrado. Gere textos na aba <strong>Gerar</strong>.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Carousel pages */}
                    {mediaMode === "carousel" && (
                      <div className="space-y-2">
                        <Label htmlFor="carouselPages">Páginas do carrossel (2-10)</Label>
                        <Input
                          id="carouselPages"
                          type="number"
                          min={2}
                          max={10}
                          value={carouselPages}
                          onChange={(e) => setCarouselPages(Number(e.target.value))}
                          disabled={isSubmitting}
                        />
                      </div>
                    )}

                    {/* Video duration */}
                    {mediaMode === "video" && (
                      <div className="space-y-2">
                        <Label htmlFor="videoDuration">Duração (segundos, 3-15)</Label>
                        <Input
                          id="videoDuration"
                          type="number"
                          min={3}
                          max={15}
                          value={videoDuration}
                          onChange={(e) => setVideoDuration(Number(e.target.value))}
                          disabled={isSubmitting}
                        />
                      </div>
                    )}

                    {/* Reference image URL */}
                    <div className="space-y-2">
                      <Label htmlFor="referenceImageUrl">URL de referência (opcional)</Label>
                      <Input
                        id="referenceImageUrl"
                        type="url"
                        value={referenceImageUrl}
                        onChange={(e) => setReferenceImageUrl(e.target.value)}
                        placeholder="https://..."
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Para vídeos, esta imagem será animada. Para imagens, serve como referência de estilo.
                      </p>
                    </div>

                    <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="w-full">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                        </>
                      ) : (
                        "Gerar"
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>

        {/* Jobs list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Jobs recentes</CardTitle>
            <Button variant="ghost" size="icon" onClick={loadJobs} disabled={!activeCompanyId || isLoadingJobs}>
              <RefreshCw className={`h-4 w-4 ${isLoadingJobs ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingJobs ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum job encontrado.</p>
            ) : (
              <ul className="space-y-2">
                {jobs.map((j) => {
                  const reqPayload = j.request_payload as Record<string, unknown>;
                  return (
                    <li key={j.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium ${statusColor(j.status)}`}>{j.status}</span>
                        <span className="text-xs text-muted-foreground">{reqPayload.mediaMode as string}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reqPayload.prompt as string}</p>
                      {(j.status === "queued" || j.status === "in_progress") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => handlePoll(j.id)}
                          disabled={pollingJobId === j.id}
                        >
                          {pollingJobId === j.id ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Verificando...
                            </>
                          ) : (
                            "Verificar status"
                          )}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}
