import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X } from "lucide-react";

interface TechDemand {
  id?: string;
  company: string;
  title: string;
  description: string;
  steps: string;
  error_message: string;
  url: string;
  image_url: string | null;
  priority: string;
}

interface TechDemandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demand: TechDemand | null;
  onSuccess: () => void;
}

export const TechDemandDialog = ({ open, onOpenChange, demand, onSuccess }: TechDemandDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<TechDemand>({
    company: "Imperia Traduções",
    title: "",
    description: "",
    steps: "processo default",
    error_message: "",
    url: "",
    image_url: null,
    priority: "medium",
  });

  useEffect(() => {
    if (demand) {
      setFormData(demand);
    } else {
      setFormData({
        company: "Imperia Traduções",
        title: "",
        description: "",
        steps: "processo default",
        error_message: "",
        url: "",
        image_url: null,
        priority: "medium",
      });
    }
  }, [demand, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `tech-demands/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast({ title: "Imagem carregada com sucesso" });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Erro ao carregar imagem",
        description: "Não foi possível fazer upload da imagem",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (demand?.id) {
        const { error } = await supabase
          .from("tech_demands")
          .update(formData)
          .eq("id", demand.id);

        if (error) throw error;
        toast({ title: "Demanda atualizada com sucesso" });
      } else {
        const { error } = await supabase
          .from("tech_demands")
          .insert([{ ...formData, created_by: (await supabase.auth.getUser()).data.user?.id }]);

        if (error) throw error;
        toast({ title: "Demanda criada com sucesso" });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving demand:", error);
      toast({
        title: "Erro ao salvar demanda",
        description: "Não foi possível salvar a demanda",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{demand ? "Editar Demanda" : "Nova Demanda"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="company">Empresa</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="title">Bug/Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="Descrição breve do problema"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição Completa</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
              placeholder="Descreva o bug em detalhes..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="steps">Etapas</Label>
            <Input
              id="steps"
              value={formData.steps}
              onChange={(e) => setFormData(prev => ({ ...prev, steps: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="error_message">Mensagem de Erro</Label>
            <Textarea
              id="error_message"
              value={formData.error_message}
              onChange={(e) => setFormData(prev => ({ ...prev, error_message: e.target.value }))}
              placeholder="Cole a mensagem de erro aqui (se houver)"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="url">URL (do documento original)</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="image">Imagem/Screenshot</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {formData.image_url && (
              <div className="mt-2 relative">
                <img src={formData.image_url} alt="Preview" className="w-full h-40 object-cover rounded" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setFormData(prev => ({ ...prev, image_url: null }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {demand ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
