import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useSidebar } from "@/contexts/SidebarContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, GripVertical, Eye } from "lucide-react";
import { toast } from "sonner";
import { CreateTemplateDialog } from "@/components/reviewChecklist/CreateTemplateDialog";
import { AddChecklistItemDialog } from "@/components/reviewChecklist/AddChecklistItemDialog";
import { TemplatePreviewDialog } from "@/components/reviewChecklist/TemplatePreviewDialog";
import { SafeHTML } from "@/components/security/SafeHTML";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  items?: ChecklistItem[];
}

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

export default function ReviewChecklistAdmin() {
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole();
  const [userName, setUserName] = useState("");

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ChecklistItem | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplate | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (data) setUserName(data.full_name || "");
      }
    };
    fetchUserProfile();
  }, [user]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from('review_checklist_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch items for each template
      const templatesWithItems = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: items } = await supabase
            .from('review_checklist_items')
            .select('*')
            .eq('template_id', template.id)
            .order('display_order', { ascending: true });
          return { ...template, items: items || [] };
        })
      );

      setTemplates(templatesWithItems);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleToggleActive = async (template: ChecklistTemplate) => {
    try {
      const { error } = await supabase
        .from('review_checklist_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      setTemplates(prev =>
        prev.map(t =>
          t.id === template.id ? { ...t, is_active: !t.is_active } : t
        )
      );
      toast.success(`Template ${!template.is_active ? 'ativado' : 'desativado'}`);
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Erro ao atualizar template');
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from('review_checklist_items')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      setTemplates(prev =>
        prev.map(t => ({
          ...t,
          items: t.items?.filter(i => i.id !== itemToDelete.id)
        }))
      );
      toast.success('Item removido com sucesso');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao remover item');
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from('review_checklist_templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      toast.success('Template removido com sucesso');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erro ao remover template');
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleAddItem = (template: ChecklistTemplate) => {
    setSelectedTemplate(template);
    setEditingItem(null);
    setAddItemDialogOpen(true);
  };

  const handleEditItem = (template: ChecklistTemplate, item: ChecklistItem) => {
    setSelectedTemplate(template);
    setEditingItem(item);
    setAddItemDialogOpen(true);
  };

  const handlePreview = (template: ChecklistTemplate) => {
    setSelectedTemplate(template);
    setPreviewDialogOpen(true);
  };

  if (roleLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar userRole={userRole || ''} />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header userName={userName} userRole={userRole || ''} />
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gerenciar Checklists</h1>
                <p className="text-muted-foreground">
                  Crie e gerencie templates de checklist para revisão
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </div>

            {/* Templates List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Nenhum template criado ainda</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeiro template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{template.name}</CardTitle>
                            <Badge variant={template.is_active ? "default" : "secondary"}>
                              {template.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          {template.description && (
                            <CardDescription>{template.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={() => handleToggleActive(template)}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePreview(template)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setTemplateToDelete(template);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Items List */}
                      {template.items && template.items.length > 0 ? (
                        <div className="space-y-2">
                          {template.items.map((item, index) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                              <span className="text-sm font-medium text-muted-foreground w-6">
                                {index + 1}.
                              </span>
                              <div className="flex-1 min-w-0">
                                <SafeHTML 
                                  html={item.title} 
                                  className="font-medium truncate [&_*]:inline"
                                />
                              </div>
                              {item.is_required && (
                                <Badge variant="outline" className="text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditItem(template, item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setItemToDelete(item);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum item adicionado
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleAddItem(template)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Item
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchTemplates}
      />

      {/* Add/Edit Item Dialog */}
      <AddChecklistItemDialog
        open={addItemDialogOpen}
        onOpenChange={setAddItemDialogOpen}
        template={selectedTemplate}
        editingItem={editingItem}
        onSuccess={fetchTemplates}
      />

      {/* Preview Dialog */}
      {selectedTemplate && (
        <TemplatePreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          template={selectedTemplate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {templateToDelete
                ? 'Tem certeza que deseja excluir este template? Todos os itens e respostas associadas serão removidos.'
                : 'Tem certeza que deseja excluir este item?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={templateToDelete ? handleDeleteTemplate : handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
