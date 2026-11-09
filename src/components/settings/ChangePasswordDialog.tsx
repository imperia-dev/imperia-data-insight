import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { passwordSchema } from "@/lib/validations/auth";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { usePasswordStrength } from "@/hooks/usePasswordStrength";
import { useToast } from "@/hooks/use-toast";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function readFunctionError(error: unknown, fallback: string) {
  const ctx = (error as { context?: unknown })?.context;
  if (ctx instanceof Response) {
    const body = await ctx.json().catch(() => null);
    if (typeof body?.error === "string") return body.error;
  }
  return fallback;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { strength, requirements } = usePasswordStrength(newPassword);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShow(false);
    setError("");
  };

  const handleClose = (next: boolean) => {
    if (loading) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) return setError("Informe sua senha atual");
    const validation = passwordSchema.safeParse(newPassword);
    if (!validation.success) return setError(validation.error.errors[0].message);
    if (newPassword !== confirmPassword) return setError("As senhas não coincidem");
    if (newPassword === currentPassword) return setError("A nova senha deve ser diferente da atual");
    if (requirements.notPwned === false) return setError("Esta senha foi encontrada em vazamentos. Escolha outra.");

    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("change-password", {
        body: { currentPassword, newPassword },
      });
      if (fnError || !data?.success) {
        setError(await readFunctionError(fnError, data?.error || "Não foi possível alterar a senha"));
        return;
      }
      toast({ title: "Senha alterada", description: "Use a nova senha no próximo acesso." });
      reset();
      onOpenChange(false);
    } catch {
      setError("Não foi possível alterar a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const type = show ? "text" : "password";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>Confirme sua senha atual e escolha uma nova senha.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha atual</Label>
            <Input
              id="current-password"
              type={type}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={type}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Ocultar senhas" : "Mostrar senhas"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {newPassword && <PasswordStrengthIndicator strength={strength} requirements={requirements} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type={type}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Alterar senha"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
