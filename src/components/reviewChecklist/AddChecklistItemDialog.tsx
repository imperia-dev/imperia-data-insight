import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  option_1_label: string;
  option_1_description: string | null;
  option_2_label: string;
  option_2_description: string | null;
  display_order: number;
  is_required: boolean;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  items?: ChecklistItem[];
}

interface AddChecklistItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ChecklistTemplate | null;
  editingItem: ChecklistItem | null;
  onSuccess: () => void;
}

export function AddChecklistItemDialog({
  open,
  onOpenChange,
  template,
  editingItem,
  onSuccess,
}: AddChecklistItemDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [option1Label, setOption1Label] = useState("Verifiquei");
  const [option1Description, setOption1Description] = useState("");
  const [option2Label, setOption2Label] = useState("Não verifiquei");
  const [option2Description, setOption2Description] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setDescription(editingItem.description || "");
      setImageUrl(editingItem.image_url || "");
      setOption1Label(editingItem.option_1_label);
      setOption1Description(editingItem.option_1_description || "");
      setOption2Label(editingItem.option_2_label);
      setOption2Description(editingItem.option_2_description || "");
      setIsRequired(editingItem.is_required);
    } else {
      resetForm();
    }
  }, [editingItem, open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageUrl("");
    setOption1Label("Verifiquei");
    setOption1Description("");
    setOption2Label("Não verifiquei");
    setOption2Description("");
    setIsRequired(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (!template) {
      toast.error("Template não selecionado");
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        template_id: template.id,
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        option_1_label: option1Label.trim(),
        option_1_description: option1Description.trim() || null,
        option_2_label: option2Label.trim(),
        option_2_description: option2Description.trim() || null,
        is_required: isRequired,
        display_order: editingItem?.display_order ?? (template.items?.length || 0)
      };

      if (editingItem) {
        const { error } = await supabase
          .from('review_checklist_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success("Item atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from('review_checklist_items')
          .insert(itemData);

        if (error) throw error;
        toast.success("Item adicionado com sucesso!");
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error("Erro ao salvar item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Item" : "Adicionar Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Edite as informações do item do checklist"
                : "Adicione um novo item de verificação ao checklist"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título do Item *</Label>
              <Input
                id="title"
                placeholder="Ex: Verifique os nomes das traduções"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o que deve ser verificado..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL da Imagem (opcional)</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://exemplo.com/imagem.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="mt-2 rounded-lg max-h-32 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>

            {/* Option 1 */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <Label className="text-sm font-semibold">Opção 1 (Positiva)</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Texto da opção (ex: Verifiquei)"
                  value={option1Label}
                  onChange={(e) => setOption1Label(e.target.value)}
                />
                <Textarea
                  placeholder="Descrição da opção (opcional)"
                  value={option1Description}
                  onChange={(e) => setOption1Description(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Option 2 */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <Label className="text-sm font-semibold">Opção 2 (Negativa)</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Texto da opção (ex: Não verifiquei)"
                  value={option2Label}
                  onChange={(e) => setOption2Label(e.target.value)}
                />
                <Textarea
                  placeholder="Descrição da opção (opcional)"
                  value={option2Description}
                  onChange={(e) => setOption2Description(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Is Required */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="required">Obrigatório</Label>
                <p className="text-sm text-muted-foreground">
                  O usuário deve responder este item para enviar o checklist
                </p>
              </div>
              <Switch
                id="required"
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : editingItem ? "Salvar Alterações" : "Adicionar Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
