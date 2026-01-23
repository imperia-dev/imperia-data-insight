import { useMemo, useState } from "react";
import { StudioShell } from "@/components/creative-studio/StudioShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useStudioCompanies } from "@/hooks/creative-studio/useStudioCompanies";
import { useActiveCompany } from "@/contexts/ActiveCompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function CreativeStudio() {
  const { toast } = useToast();
  const { data: companies, isLoading, refetch } = useStudioCompanies();
  const { activeCompanyId, setActiveCompanyId } = useActiveCompany();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const activeCompany = useMemo(
    () => companies?.find((c) => c.id === activeCompanyId) || null,
    [companies, activeCompanyId]
  );

  const createCompany = async () => {
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe o nome da empresa." });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_company", {
        p_name: name.trim(),
        p_description: description.trim() || null,
      });
      if (error) throw error;

      setActiveCompanyId(data);
      setName("");
      setDescription("");
      await refetch();

      toast({
        title: "Empresa criada",
        description: "Agora selecione/complete o Brand Kit para começar a gerar criativos.",
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: "Não foi possível criar a empresa.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <StudioShell title="Creative Studio">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Minhas empresas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="h-24 rounded-lg bg-muted animate-pulse" />
            ) : (companies?.length || 0) === 0 ? (
              <p className="text-muted-foreground">Você ainda não tem empresas no Creative Studio.</p>
            ) : (
              <div className="space-y-2">
                {companies!.map((c) => {
                  const isActive = c.id === activeCompanyId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveCompanyId(c.id)}
                      className={cn(
                        "w-full text-left rounded-lg border p-4 transition",
                        isActive ? "border-primary bg-primary/5" : "hover:bg-muted"
                      )}
                    >
                      <div className="font-semibold">{c.name}</div>
                      {c.description ? (
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</div>
                      ) : null}
                      {isActive ? (
                        <div className="text-xs text-primary mt-2">Empresa ativa</div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {activeCompany ? (
              <p className="text-sm text-muted-foreground">
                Empresa ativa: <span className="text-foreground font-medium">{activeCompany.name}</span>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Criar empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome *</Label>
              <Input id="companyName" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyDesc">Descrição</Label>
              <Input id="companyDesc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button className="w-full" onClick={createCompany} disabled={creating}>
              {creating ? "Criando..." : "Criar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}
