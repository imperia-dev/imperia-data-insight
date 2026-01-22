import { useCallback, useEffect, useMemo, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Mic, PhoneOff } from "lucide-react";

type TranscriptItem =
  | { id: string; who: "user"; text: string; createdAt: number }
  | { id: string; who: "agent"; text: string; createdAt: number };

export default function AIAgent() {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (!error && data?.full_name) setUserName(data.full_name);
    };

    fetchUserProfile();
  }, [user]);

  const conversation = useConversation({
    onConnect: () => {
      toast({ title: "Conectado", description: "Conversa iniciada." });
    },
    onDisconnect: () => {
      toast({ title: "Conversa encerrada" });
    },
    onError: (error) => {
      console.error("ElevenLabs conversation error:", error);
      toast({
        variant: "destructive",
        title: "Erro na conexão",
        description: "Falha ao conectar no agente. Tente novamente.",
      });
    },
    onMessage: (message: any) => {
      // Eventos exatos variam conforme configuração no painel do ElevenLabs.
      // Lidamos com os mais comuns:
      switch (message.type) {
        case "user_transcript": {
          const text =
            message.user_transcription_event?.user_transcript ??
            message.text ??
            "";
          if (!text) return;
          setTranscripts((prev) => [
            ...prev,
            { id: crypto.randomUUID(), who: "user", text, createdAt: Date.now() },
          ]);
          break;
        }
        case "agent_response": {
          const text =
            message.agent_response_event?.agent_response ??
            message.text ??
            "";
          if (!text) return;
          setTranscripts((prev) => [
            ...prev,
            { id: crypto.randomUUID(), who: "agent", text, createdAt: Date.now() },
          ]);
          break;
        }
        default:
          break;
      }
    },
    clientTools: {
      // Tool genérica para o agente buscar dados internos com RBAC.
      // Ela chama a Edge Function agent-toolkit (server-side) e retorna o JSON pro agente.
      fetchPlatformInfo: async (params: { tool: string; args?: Record<string, unknown> }) => {
        const { data, error } = await supabase.functions.invoke("agent-toolkit", {
          body: {
            tool: params.tool,
            args: params.args ?? {},
          },
        });

        if (error) {
          console.error("agent-toolkit error", error);
          return "Não foi possível buscar as informações agora.";
        }

        return JSON.stringify(data);
      },
    },
  });

  const statusLabel = useMemo(() => {
    if (conversation.status === "connected") return "Conectado";
    if (conversation.status === "disconnected") return "Desconectado";
    return conversation.status;
  }, [conversation.status]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Explicar e pedir permissão do microfone
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-conversation-token",
      );
      if (error) throw error;
      if (!data?.token) throw new Error("Token não recebido");

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (err) {
      console.error("Failed to start conversation", err);
      toast({
        variant: "destructive",
        title: "Não foi possível iniciar",
        description:
          "Verifique permissão do microfone e se sua role tem acesso ao agente.",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, toast]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("Failed to end session", err);
    }
  }, [conversation]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />

        <main className="container mx-auto p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-foreground">Agente (Voz)</h1>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Status: {statusLabel}</Badge>
              <Badge variant="outline">
                {conversation.isSpeaking ? "Falando" : "Ouvindo"}
              </Badge>
            </div>
          </div>

          <Card className="mt-6">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Conversa</CardTitle>
              <div className="flex flex-wrap gap-2">
                {conversation.status === "disconnected" ? (
                  <Button onClick={startConversation} disabled={isConnecting}>
                    <Mic className="mr-2 h-4 w-4" />
                    {isConnecting ? "Conectando..." : "Iniciar"}
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={stopConversation}>
                    <PhoneOff className="mr-2 h-4 w-4" />
                    Encerrar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Dica: o agente só atende roles altas. Para dados internos, ele usa ferramentas
                protegidas por RBAC (Edge Function).
              </p>

              <div className="mt-4 rounded-lg border bg-card">
                <ScrollArea className="h-[420px] p-4">
                  <div className="flex flex-col gap-3">
                    {transcripts.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Nada ainda. Clique em “Iniciar” e fale.
                      </div>
                    ) : (
                      transcripts.map((t) => (
                        <div
                          key={t.id}
                          className={
                            t.who === "user"
                              ? "self-end max-w-[85%] rounded-lg bg-muted px-3 py-2"
                              : "self-start max-w-[85%] rounded-lg bg-accent px-3 py-2"
                          }
                        >
                          <div className="text-xs text-muted-foreground">
                            {t.who === "user" ? "Você" : "Agente"}
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap">
                            {t.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
