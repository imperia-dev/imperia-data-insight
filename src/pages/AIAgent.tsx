import { useCallback, useEffect, useMemo, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Mic, PhoneOff } from "lucide-react";
import { motion } from "framer-motion";

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

  const micState = useMemo(() => {
    if (isConnecting) return "connecting" as const;
    if (conversation.status !== "connected") return "disconnected" as const;
    return conversation.isSpeaking ? ("speaking" as const) : ("listening" as const);
  }, [conversation.isSpeaking, conversation.status, isConnecting]);

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
                Clique em <span className="font-medium text-foreground">Iniciar</span> e fale.
                O microfone anima conforme o agente responde (tempo real).
              </p>

              <div className="mt-6 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={conversation.status === "disconnected" ? startConversation : stopConversation}
                  disabled={isConnecting}
                  aria-label={conversation.status === "disconnected" ? "Iniciar conversa" : "Encerrar conversa"}
                  className="group relative flex h-56 w-56 items-center justify-center rounded-full border bg-card shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {/* Rings / pulsos */}
                  {micState !== "disconnected" && (
                    <>
                      <motion.div
                        aria-hidden
                        className="absolute inset-0 rounded-full border bg-transparent"
                        animate={{
                          scale: micState === "speaking" ? [1, 1.08, 1] : [1, 1.04, 1],
                          opacity: micState === "speaking" ? [0.35, 0.15, 0.35] : [0.25, 0.12, 0.25],
                        }}
                        transition={{ duration: micState === "speaking" ? 0.9 : 1.4, repeat: Infinity }}
                      />
                      <motion.div
                        aria-hidden
                        className="absolute inset-[-14px] rounded-full border bg-transparent"
                        animate={{
                          scale: micState === "speaking" ? [1, 1.14, 1] : [1, 1.08, 1],
                          opacity: micState === "speaking" ? [0.25, 0.08, 0.25] : [0.18, 0.06, 0.18],
                        }}
                        transition={{ duration: micState === "speaking" ? 1.1 : 1.7, repeat: Infinity }}
                      />
                    </>
                  )}

                  {/* Corpo do mic */}
                  <motion.div
                    className="relative z-10 flex h-40 w-40 items-center justify-center rounded-full bg-muted"
                    animate={{
                      scale:
                        micState === "connecting"
                          ? [1, 0.98, 1]
                          : micState === "speaking"
                            ? [1, 1.04, 1]
                            : [1, 1.01, 1],
                    }}
                    transition={{ duration: micState === "speaking" ? 0.6 : 1.2, repeat: Infinity }}
                  >
                    <Mic className="h-14 w-14 text-foreground" />

                    {/* Equalizer simples quando falando */}
                    {micState === "speaking" && (
                      <div className="absolute -bottom-6 flex items-end gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 rounded-full bg-primary"
                            initial={false}
                            animate={{ height: [8, 22, 10, 26, 12] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.08,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {/* Removido texto abaixo do microfone para UI mais clean/friendly */}
                </button>

                {/* Mantemos só um “último turno” discreto (sem caixa grande) */}
                {transcripts.length > 0 && (
                  <div className="mt-6 w-full max-w-3xl rounded-lg border bg-card p-4 animate-fade-in">
                    <div className="text-xs text-muted-foreground">Última fala</div>
                    <div className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                      {transcripts[transcripts.length - 1]?.text}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
