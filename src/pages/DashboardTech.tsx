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
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent,
  DragOverEvent,
  closestCorners
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
  backlog: { label: "Backlog", color: "bg-gray-500" },
  in_progress: { label: "Em Progresso", color: "bg-blue-500" },
  review: { label: "Em Revisão", color: "bg-yellow-500" },
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

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dragging over a column (status)
    if (Object.keys(statusConfig).includes(overId)) {
      return;
    }

    // Find the containers (columns) of both active and over items
    const activeContainer = Object.keys(demandsByStatus).find(key =>
      demandsByStatus[key as keyof typeof demandsByStatus].some(d => d.id === activeId)
    );
    const overContainer = Object.keys(demandsByStatus).find(key =>
      demandsByStatus[key as keyof typeof demandsByStatus].some(d => d.id === overId)
    );

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDemand(null);

    if (!over) return;

    const demandId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    if (Object.keys(statusConfig).includes(overId)) {
      const demand = demands.find(d => d.id === demandId);
      if (demand && demand.status !== overId) {
        updateStatusMutation.mutate({ id: demandId, status: overId });
      }
      return;
    }

    // Check if dropped on another card
    const overDemand = demands.find(d => d.id === overId);
    if (overDemand) {
      const demand = demands.find(d => d.id === demandId);
      if (demand && demand.status !== overDemand.status) {
        updateStatusMutation.mutate({ id: demandId, status: overDemand.status });
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

  const canManage = ["owner", "master", "admin"].includes(userRole);

  const demandsByStatus = {
    backlog: demands.filter(d => d.status === "backlog"),
    in_progress: demands.filter(d => d.status === "in_progress"),
    review: demands.filter(d => d.status === "review"),
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
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              collisionDetection={closestCorners}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <SortableContext
                        items={columnDemands.map(d => d.id)}
                        strategy={verticalListSortingStrategy}
                        id={status}
                      >
                        <div 
                          id={status}
                          className="flex flex-col gap-3 flex-1 min-h-[400px]"
                        >
                          {columnDemands.map((demand) => (
                            <TechDemandCard
                              key={demand.id}
                              demand={demand}
                              onEdit={handleEdit}
                              onDelete={handleDeleteClick}
                              canManage={canManage}
                            />
                          ))}
                          {columnDemands.length === 0 && (
                            <div className="text-center text-muted-foreground text-sm py-8">
                              Nenhuma demanda
                            </div>
                          )}
                        </div>
                      </SortableContext>
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
