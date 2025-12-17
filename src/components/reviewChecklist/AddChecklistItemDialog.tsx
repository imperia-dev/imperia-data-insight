import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Image as ImageIcon, Bold, Italic, Underline } from "lucide-react";

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
  const [imageUrl, setImageUrl] = useState("");
  const [option1Label, setOption1Label] = useState("Verifiquei");
  const [option1Description, setOption1Description] = useState("");
  const [option2Label, setOption2Label] = useState("Não verifiquei");
  const [option2Description, setOption2Description] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setImageUrl(editingItem.image_url || "");
      setOption1Label(editingItem.option_1_label);
      setOption1Description(editingItem.option_1_description || "");
      setOption2Label(editingItem.option_2_label);
      setOption2Description(editingItem.option_2_description || "");
      if (titleRef.current) {
        titleRef.current.innerHTML = editingItem.title;
      }
    } else {
      resetForm();
      if (titleRef.current) {
        titleRef.current.innerHTML = "";
      }
    }
  }, [editingItem, open]);

  const resetForm = () => {
    setTitle("");
    setImageUrl("");
    setOption1Label("Verifiquei");
    setOption1Description("");
    setOption2Label("Não verifiquei");
    setOption2Description("");
  };

  const uploadImage = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name?.split('.').pop() || 'png';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `checklist-items/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadImage(file);
        }
        break;
      }
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const titleContent = titleRef.current?.innerHTML || title;
    const plainTextTitle = titleContent.replace(/<[^>]*>/g, '').trim();
    
    if (!plainTextTitle) {
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
        title: titleContent.trim(),
        description: null,
        image_url: imageUrl || null,
        option_1_label: option1Label.trim(),
        option_1_description: option1Description.trim() || null,
        option_2_label: option2Label.trim(),
        option_2_description: option2Description.trim() || null,
        is_required: true,
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
            {/* Title with Rich Text */}
            <div className="space-y-2">
              <Label>Título do Item *</Label>
              <div className="flex items-center gap-1 mb-2 p-1 rounded-md bg-muted/50 w-fit">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => document.execCommand('bold')}
                  title="Negrito"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => document.execCommand('italic')}
                  title="Itálico"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => document.execCommand('underline')}
                  title="Sublinhado"
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </div>
              <div
                ref={titleRef}
                contentEditable
                className="min-h-[40px] px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onInput={(e) => setTitle(e.currentTarget.innerHTML)}
                data-placeholder="Ex: Verifique os nomes das traduções"
                style={{ 
                  minHeight: '40px',
                  wordBreak: 'break-word'
                }}
                suppressContentEditableWarning
              />
              <style>{`
                [contenteditable]:empty:before {
                  content: attr(data-placeholder);
                  color: hsl(var(--muted-foreground));
                  pointer-events: none;
                }
              `}</style>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Imagem (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="rounded-lg max-h-40 object-contain border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  tabIndex={0}
                  onPaste={handlePaste}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm">Clique para enviar ou cole (Ctrl+V)</span>
                    </span>
                  )}
                </div>
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? "Salvando..." : editingItem ? "Salvar Alterações" : "Adicionar Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
