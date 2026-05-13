import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTrialCustomer } from "../TrialPortalGuard";
import { sanitizeInput } from "@/lib/validations/sanitized";

export default function PortalSettings() {
  const { customer } = useTrialCustomer();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setFullName(customer.full_name);
    setPhone(customer.phone || "");
    setCompany(customer.company || "");
  }, [customer]);

  const saveProfile = async () => {
    if (!customer) return;
    const name = sanitizeInput(fullName).trim();
    if (!name) {
      toast.error("Nome obrigatório");
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from("trial_customers")
      .update({
        full_name: name,
        phone: sanitizeInput(phone).trim(),
        company: sanitizeInput(company).trim() || null,
      })
      .eq("id", customer.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success("Dados atualizados");
  };

  const savePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Senha precisa ter pelo menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) {
      toast.error("Erro ao atualizar senha", { description: error.message });
      return;
    }
    toast.success("Senha atualizada");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie os dados da sua conta.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados da conta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={customer?.email || ""} disabled />
          </div>
          <div>
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Trocar senha</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nova senha</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Label>Confirmar senha</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={savePassword} disabled={savingPwd}>
              {savingPwd && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Atualizar senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
