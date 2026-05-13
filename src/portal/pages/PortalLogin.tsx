import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PortalLayout } from "../PortalLayout";

export default function PortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    navigate("/portal/app", { replace: true });
  };

  return (
    <PortalLayout showAuthActions={false}>
      <div className="max-w-md mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Entrar no portal</CardTitle>
            <CardDescription>Acesse sua conta de cliente trial.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Entrar
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Ainda não tem conta? <Link to="/portal/cadastro" className="text-primary hover:underline">Criar agora</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
