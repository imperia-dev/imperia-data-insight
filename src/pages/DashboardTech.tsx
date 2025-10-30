import { useEffect, useState } from "react";
import { Bug, Plus, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TechDemandCard } from "@/components/tech/TechDemandCard";
import { TechDemandDialog } from "@/components/tech/TechDemandDialog";
import { TechDemandViewDialog } from "@/components/tech/TechDemandViewDialog";
import { DroppableColumn } from "@/components/tech/DroppableColumn";
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface TechDemand {
  id: string;
  company: string;
  title: string;
  description: string;
  steps: string;
  error_message: string | null;
  url: string | null;
  image_url: string | null;
  status: string;
  priority: string;
  created_at: string;
  assigned_to: string | null;
}

const statusConfig = {
  novo: { label: "Novo", color: "bg-slate-500" },
  assigned: { label: "Direcionado", color: "bg-indigo-500" },
  in_progress: { label: "Em Progresso", color: "bg-blue-500" },
  validation: { label: "Validação", color: "bg-yellow-500" },
  fix: { label: "Corrigir", color: "bg-orange-500" },
  done: { label: "Concluído", color: "bg-green-500" },
};

export default function DashboardTech() {
  const { user } = useAuth();
  const { mainContainerClass } = useSidebarOffset();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<TechDemand | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [demandToDelete, setDemandToDelete] = useState<string | null>(null);
  const [activeDemand, setActiveDemand] = useState<TechDemand | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewDemand, setViewDemand] = useState<TechDemand | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
          setUserRole(data.role);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ["tech-demands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tech_demands")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TechDemand[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("tech_demands")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-demands"] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tech_demands")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-demands"] });
      toast({ title: "Demanda excluída com sucesso" });
      setDeleteDialogOpen(false);
      setDemandToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erro ao excluir demanda",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const demand = demands.find(d => d.id === event.active.id);
    setActiveDemand(demand || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDemand(null);

    if (!over) return;

    const demandId = active.id as string;
    const overId = over.id as string;

    // Find which status the card was dropped on
    let newStatus: string | null = null;

    // Check if dropped directly on a column (droppable area)
    if (Object.keys(statusConfig).includes(overId)) {
      newStatus = overId;
    } else {
      // Check if dropped on another card
      const overDemand = demands.find(d => d.id === overId);
      if (overDemand) {
        newStatus = overDemand.status;
      }
    }

    // Update status if changed
    if (newStatus) {
      const demand = demands.find(d => d.id === demandId);
      if (demand && demand.status !== newStatus) {
        updateStatusMutation.mutate({ id: demandId, status: newStatus });
      }
    }
  };

  const handleCreateNew = () => {
    setSelectedDemand(null);
    setDialogOpen(true);
  };

  const handleEdit = (demand: TechDemand) => {
    setSelectedDemand(demand);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDemandToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (demandToDelete) {
      deleteMutation.mutate(demandToDelete);
    }
  };

  const handleView = (demand: TechDemand) => {
    setViewDemand(demand);
    setViewDialogOpen(true);
  };

  const canManage = ["owner", "master", "admin"].includes(userRole);

  const demandsByStatus = {
    novo: demands.filter(d => d.status === "novo"),
    assigned: demands.filter(d => d.status === "assigned"),
    in_progress: demands.filter(d => d.status === "in_progress"),
    validation: demands.filter(d => d.status === "validation"),
    fix: demands.filter(d => d.status === "fix"),
    done: demands.filter(d => d.status === "done"),
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <Bug className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Gestão de Demandas Tech</h1>
                <p className="text-muted-foreground">Kanban de bugs e melhorias</p>
              </div>
            </div>
            {canManage && (
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Demanda
              </Button>
            )}
          </div>

          {/* Kanban Board */}
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {Object.entries(statusConfig).map(([status, config]) => {
                  const columnDemands = demandsByStatus[status as keyof typeof demandsByStatus];
                  
                  return (
                    <div
                      key={status}
                      className="flex flex-col gap-3 bg-muted/30 p-4 rounded-lg min-h-[500px]"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${config.color}`} />
                          <h3 className="font-semibold">{config.label}</h3>
                        </div>
                        <Badge variant="secondary">{columnDemands.length}</Badge>
                      </div>

                      {/* Column Content - Droppable area */}
                      <DroppableColumn id={status}>
                        <SortableContext
                          items={columnDemands.map(d => d.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {columnDemands.map((demand) => (
                            <TechDemandCard
                              key={demand.id}
                              demand={demand}
                              onEdit={handleEdit}
                              onDelete={handleDeleteClick}
                              onView={handleView}
                              canManage={canManage}
                            />
                          ))}
                          {columnDemands.length === 0 && (
                            <div className="text-center text-muted-foreground text-sm py-8">
                              Arraste cards aqui
                            </div>
                          )}
                        </SortableContext>
                      </DroppableColumn>
                    </div>
                  );
                })}
              </div>

              <DragOverlay>
                {activeDemand && (
                  <Card className="p-4 opacity-90 rotate-3 shadow-xl">
                    <TechDemandCard
                      demand={activeDemand}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onView={() => {}}
                      canManage={false}
                    />
                  </Card>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </main>
      </div>

      {/* Dialogs */}
      <TechDemandDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        demand={selectedDemand}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["tech-demands"] })}
      />

      <TechDemandViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        demand={viewDemand}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir demanda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A demanda será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
