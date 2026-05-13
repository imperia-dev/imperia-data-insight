import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { usePageLayout } from "@/hooks/usePageLayout";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string | null;
  cpf_cnpj: string | null;
  status: "pending" | "approved" | "rejected" | "deactivated";
  created_at: string;
  rejection_reason: string | null;
};

export default function TrialApprovals() {
  const { userRole, loading: roleLoading } = useRoleAccess("/trial-approvals");
  const { mainContainerClass } = usePageLayout();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  const allowed = userRole === "owner" || userRole === "master";

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("trial_customers").select("*").order("created_at", { ascending: false });
    setItems((data as Customer[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  const sendStatusEmail = async (c: Customer, status: "approved" | "rejected", reason?: string) => {
    try {
      await supabase.functions.invoke("send-trial-status-email", {
        body: { recipient_email: c.email, recipient_name: c.full_name, status, reason },
      });
    } catch (e) {
      console.error("send-trial-status-email failed", e);
    }
  };

  const approve = async (id: string) => {
    const customer = items.find((i) => i.id === id);
    const { error } = await supabase.rpc("approve_trial_customer", { _customer_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente aprovado");
    if (customer) await sendStatusEmail(customer, "approved");
    load();
  };

  const reject = async (id: string) => {
    const reason = prompt("Motivo da rejeição:") || "";
    if (!reason.trim()) return;
    const customer = items.find((i) => i.id === id);
    const { error } = await supabase.rpc("reject_trial_customer", { _customer_id: id, _reason: reason.trim() });
    if (error) { toast.error(error.message); return; }
    toast.success("Cadastro rejeitado");
    if (customer) await sendStatusEmail(customer, "rejected", reason.trim());
    load();
  };


  const deactivate = async (id: string) => {
    if (!confirm("Desativar este cliente?")) return;
    const { error } = await supabase.rpc("deactivate_trial_customer", { _customer_id: id });
    if (error) toast.error(error.message);
    else { toast.success("Cliente desativado"); load(); }
  };

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!allowed) return null;

  const filtered = items.filter((c) => c.status === tab);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole || ""} />
      <Header userName="" userRole={userRole || ""} />
      <main className={`${mainContainerClass} pt-20 pb-8`}>
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Cadastros do Portal Trial</h1>
            <p className="text-muted-foreground">Aprove ou rejeite leads que se cadastraram no portal.</p>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="approved">Aprovados</TabsTrigger>
              <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
              <TabsTrigger value="deactivated">Desativados</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
              <Card>
                <CardContent className="pt-6">
                  {loading ? (
                    <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : filtered.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">Nenhum cadastro nesta categoria.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-muted-foreground border-b">
                          <tr>
                            <th className="py-2 pr-4">Nome</th>
                            <th className="py-2 pr-4">Email</th>
                            <th className="py-2 pr-4">Telefone</th>
                            <th className="py-2 pr-4">Empresa</th>
                            <th className="py-2 pr-4">Data</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((c) => (
                            <tr key={c.id} className="border-b last:border-0">
                              <td className="py-3 pr-4 font-medium">{c.full_name}</td>
                              <td className="py-3 pr-4">{c.email}</td>
                              <td className="py-3 pr-4">{c.phone}</td>
                              <td className="py-3 pr-4">{c.company || "—"}</td>
                              <td className="py-3 pr-4">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                              <td className="py-3 text-right space-x-2">
                                {c.status === "pending" && (
                                  <>
                                    <Button size="sm" onClick={() => approve(c.id)}><Check className="h-4 w-4 mr-1" /> Aprovar</Button>
                                    <Button size="sm" variant="outline" onClick={() => reject(c.id)}><X className="h-4 w-4 mr-1" /> Rejeitar</Button>
                                  </>
                                )}
                                {c.status === "approved" && (
                                  <Button size="sm" variant="outline" onClick={() => deactivate(c.id)}>Desativar</Button>
                                )}
                                {c.status === "rejected" && c.rejection_reason && (
                                  <span className="text-xs text-muted-foreground">{c.rejection_reason}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
