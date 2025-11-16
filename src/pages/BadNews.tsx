import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const problemTypes = [
  { value: "technical", label: "Problema Técnico" },
  { value: "process", label: "Problema de Processo" },
  { value: "communication", label: "Problema de Comunicação" },
  { value: "quality", label: "Problema de Qualidade" },
  { value: "deadline", label: "Problema de Prazo" },
  { value: "resource", label: "Falta de Recursos" },
  { value: "other", label: "Outro" },
];

const BadNews = () => {
  const { user } = useAuth();
  const [problemType, setProblemType] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!problemType) {
      toast({
        title: "Tipo de problema obrigatório",
        description: "Por favor, selecione o tipo de problema.",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      toast({
        title: "Descrição obrigatória",
        description: "Por favor, descreva o problema com pelo menos 10 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("bad_news_reports")
        .insert({
          problem_type: problemType,
          description: description.trim(),
        });

      if (error) throw error;

      toast({
        title: "Relatório enviado com sucesso",
        description: "Sua notificação foi registrada anonimamente. Obrigado pelo feedback!",
      });

      // Reset form
      setProblemType("");
      setDescription("");
    } catch (error) {
      console.error("Error submitting bad news report:", error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userName={user?.user_metadata?.full_name || user?.email || "Usuário"}
        userRole={user?.user_metadata?.role || "user"}
      />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <CardTitle className="text-2xl">Departamento de Notícias Ruins</CardTitle>
                <CardDescription className="mt-2">
                  Este é um canal anônimo para relatar problemas, preocupações ou situações que precisam de atenção.
                  Nenhuma informação sobre quem enviou será rastreada.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>100% Anônimo:</strong> Nenhuma informação pessoal é coletada. 
                Não há como rastrear quem enviou este relatório.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="problem-type">Tipo de Problema *</Label>
                <Select value={problemType} onValueChange={setProblemType}>
                  <SelectTrigger id="problem-type">
                    <SelectValue placeholder="Selecione o tipo de problema" />
                  </SelectTrigger>
                  <SelectContent>
                    {problemTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição do Problema *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o que aconteceu, o contexto e o impacto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[200px] resize-none"
                  maxLength={2000}
                />
                <p className="text-sm text-muted-foreground">
                  {description.length}/2000 caracteres
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !problemType || description.trim().length < 10}
                className="w-full"
                size="lg"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? "Enviando..." : "Enviar Relatório Anônimo"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BadNews;
