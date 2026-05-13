import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PortalLayout } from "../PortalLayout";

function formatPhoneBR(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCpfCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;
const cpfCnpjRegex = /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/;

const schema = z.object({
  full_name: z.string().trim().min(3, "Nome muito curto").max(120),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().regex(phoneRegex, "Telefone inválido (use DDD + número)"),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  cpf_cnpj: z
    .string()
    .trim()
    .refine((v) => v === "" || cpfCnpjRegex.test(v), "CPF ou CNPJ inválido")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Senha precisa ter ao menos 8 caracteres").max(72),
});


export default function PortalSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    cpf_cnpj: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Verifique os dados", { description: parsed.error.errors[0]?.message });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: `${window.location.origin}/portal/login` },
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error("Não foi possível cadastrar", { description: error?.message });
      return;
    }

    const { error: insertError } = await supabase.from("trial_customers").insert({
      user_id: data.user.id,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      company: parsed.data.company || null,
      cpf_cnpj: parsed.data.cpf_cnpj || null,
    });
    setLoading(false);
    if (insertError) {
      toast.error("Erro ao salvar cadastro", { description: insertError.message });
      return;
    }
    toast.success("Cadastro enviado!", { description: "Sua conta está em análise." });
    navigate("/portal/aguardando", { replace: true });
  };

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <PortalLayout showAuthActions={false}>
      <div className="max-w-xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Criar conta no portal</CardTitle>
            <CardDescription>Preencha seus dados. Aprovaremos seu acesso em breve.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nome completo *</Label>
                <Input id="full_name" required value={form.full_name} onChange={update("full_name")} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" required value={form.email} onChange={update("email")} />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input id="phone" required placeholder="+55 11 90000-0000" value={form.phone} onChange={update("phone")} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input id="company" value={form.company} onChange={update("company")} />
                </div>
                <div>
                  <Label htmlFor="cpf_cnpj">CPF / CNPJ</Label>
                  <Input id="cpf_cnpj" value={form.cpf_cnpj} onChange={update("cpf_cnpj")} />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input id="password" type="password" required minLength={8} value={form.password} onChange={update("password")} autoComplete="new-password" />
                <p className="text-xs text-muted-foreground mt-1">Mínimo 8 caracteres.</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar cadastro
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Já tem conta? <Link to="/portal/login" className="text-primary hover:underline">Entrar</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
