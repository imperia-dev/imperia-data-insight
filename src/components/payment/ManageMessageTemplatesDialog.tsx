import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit, FileText, Star } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { sanitizeInput, sanitizeRichTextInput } from "@/lib/validations/sanitized";

interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
  is_default: boolean;
  created_at: string;
}

export function ManageMessageTemplatesDialog() {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar modelos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('payment_message_templates')
          .update({
            name: sanitizeInput(name),
            subject: sanitizeInput(subject),
            message: sanitizeRichTextInput(message),
            is_default: isDefault,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Modelo atualizado com sucesso",
        });
      } else {
        // Create new template
        const { error } = await supabase
          .from('payment_message_templates')
          .insert({
            name: sanitizeInput(name),
            subject: sanitizeInput(subject),
            message: sanitizeRichTextInput(message),
            is_default: isDefault,
            created_by: user?.id,
          });

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Modelo criado com sucesso",
        });
      }

      // Reset form
      setName("");
      setSubject("");
      setMessage("");
      setIsDefault(false);
      setEditingTemplate(null);
      
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar modelo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setSubject(template.subject);
    setMessage(template.message);
    setIsDefault(template.is_default);
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setName("");
    setSubject("");
    setMessage("");
    setIsDefault(false);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('payment_message_templates')
        .delete()
        .eq('id', templateToDelete);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Modelo excluído com sucesso",
      });
      
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir modelo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const confirmDelete = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Gerenciar Modelos
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Modelos de Mensagem</DialogTitle>
            <DialogDescription>
              Crie e gerencie seus modelos de mensagem personalizados
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">
                {editingTemplate ? "Editar Modelo" : "Novo Modelo"}
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="template-name">Nome do Modelo *</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Formal, Urgente, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-subject">Assunto *</Label>
                <Input
                  id="template-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Assunto do e-mail"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-message">Mensagem *</Label>
                <Textarea
                  id="template-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  placeholder="Corpo da mensagem"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-default"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is-default" className="cursor-pointer">
                  Usar como padrão
                </Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={loading} className="flex-1">
                  {loading ? "Salvando..." : editingTemplate ? "Atualizar" : "Salvar"}
                </Button>
                {editingTemplate && (
                  <Button onClick={handleCancelEdit} variant="outline">
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            {/* Templates List Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Meus Modelos</h3>
              
              {loading && templates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Carregando...</p>
              ) : templates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum modelo criado ainda
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {templates.map((template) => (
                    <Card key={template.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            {template.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Padrão
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => confirmDelete(template.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-xs mb-2">
                          <strong>Assunto:</strong> {template.subject}
                        </CardDescription>
                        <CardDescription className="text-xs line-clamp-3">
                          {template.message}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
