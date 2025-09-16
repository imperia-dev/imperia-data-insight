import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";

interface UserLimit {
  id?: string;
  user_id: string;
  full_name: string;
  email: string;
  daily_limit: number;
  concurrent_order_limit: number;
}

export function DemandControl() {
  const { userRole } = useRoleAccess('/demand-control');
  const { sidebarOffsetClass } = useSidebarOffset();
  const [users, setUsers] = useState<UserLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserLimits();
  }, []);

  const fetchUserLimits = async () => {
    try {
      setLoading(true);

      // Fetch all operation users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "operation");

      if (profilesError) throw profilesError;

      // Fetch existing limits
      const { data: limits, error: limitsError } = await supabase
        .from("user_document_limits")
        .select("*");

      if (limitsError) throw limitsError;

      // Merge data
      const mergedData = profiles?.map(profile => {
        const limit = limits?.find(l => l.user_id === profile.id);
        return {
          id: limit?.id,
          user_id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          daily_limit: limit?.daily_limit || 10,
          concurrent_order_limit: limit?.concurrent_order_limit || 2
        };
      }) || [];

      setUsers(mergedData);
    } catch (error) {
      console.error("Error fetching user limits:", error);
      toast({
        title: "Erro ao carregar limites",
        description: "Não foi possível carregar os limites dos usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (userId: string, field: 'daily_limit' | 'concurrent_order_limit', value: string) => {
    const numValue = parseInt(value) || 0;
    setUsers(prev => prev.map(user => 
      user.user_id === userId 
        ? { ...user, [field]: numValue }
        : user
    ));
  };

  const saveUserLimit = async (user: UserLimit) => {
    try {
      setSaving(user.user_id);

      if (user.id) {
        // Update existing limit
        const { error } = await supabase
          .from("user_document_limits")
          .update({ 
            daily_limit: user.daily_limit,
            concurrent_order_limit: user.concurrent_order_limit,
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id);

        if (error) throw error;
      } else {
        // Insert new limit
        const { error } = await supabase
          .from("user_document_limits")
          .insert({ 
            user_id: user.user_id,
            daily_limit: user.daily_limit,
            concurrent_order_limit: user.concurrent_order_limit
          });

        if (error) throw error;
      }

      toast({
        title: "Limites salvos",
        description: `Limites de ${user.full_name} atualizados com sucesso`,
      });

      // Refresh data to get the updated IDs
      await fetchUserLimits();
    } catch (error) {
      console.error("Error saving limit:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o limite do usuário",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar userRole={userRole || 'owner'} />
        <div className={`container mx-auto py-8 transition-all duration-300 ${sidebarOffsetClass}`}>
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole || 'owner'} />
      <div className={`container mx-auto py-8 px-4 transition-all duration-300 ${sidebarOffsetClass}`}>
        <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle>Controle de Demanda</CardTitle>
          </div>
          <CardDescription>
            Defina o limite máximo de documentos que cada tradutor pode pegar por dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário com role 'operation' encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[150px]">Limite Diário</TableHead>
                  <TableHead className="w-[150px]">Limite Simultâneo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="999"
                        value={user.daily_limit}
                        onChange={(e) => handleLimitChange(user.user_id, 'daily_limit', e.target.value)}
                        className="w-24"
                        title="Limite de documentos por dia"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={user.concurrent_order_limit}
                        onChange={(e) => handleLimitChange(user.user_id, 'concurrent_order_limit', e.target.value)}
                        className="w-24"
                        title="Máximo de pedidos simultâneos"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => saveUserLimit(user)}
                        disabled={saving === user.user_id}
                      >
                        {saving === user.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}