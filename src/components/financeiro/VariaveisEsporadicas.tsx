import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

interface VariaveisEsporadicasProps {
  tipo: "pagar" | "receber";
  onSuccess?: () => void;
}

export function VariaveisEsporadicas({ tipo, onSuccess }: VariaveisEsporadicasProps) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivo(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!descricao || !valor) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let arquivoUrl = null;

      // Upload do arquivo se houver
      if (arquivo) {
        const fileExt = arquivo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `variaveis-esporadicas/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, arquivo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        arquivoUrl = publicUrl;
      }

      // Inserir registro
      const { error } = await supabase
        .from('variaveis_esporadicas')
        .insert({
          tipo,
          descricao,
          valor: parseFloat(valor),
          arquivo_url: arquivoUrl,
          status: 'aguardando_nf'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Variável esporádica adicionada com sucesso",
      });

      // Limpar formulário
      setDescricao("");
      setValor("");
      setArquivo(null);

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar variável esporádica",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variáveis Esporádicas</CardTitle>
        <CardDescription>
          Adicione despesas ou receitas esporádicas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a variável esporádica"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$) *</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arquivo">Arquivo Comprobatório</Label>
            <Input
              id="arquivo"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Adicionar
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
