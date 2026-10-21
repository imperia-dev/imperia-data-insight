import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ShieldCheck, Download, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useConfidentiality } from "@/hooks/useConfidentiality";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { canAcceptConfidentiality, downloadConfidentiality, hasCurrentAcceptance, requiresConfidentiality } from "@/lib/confidentiality";
import { sanitizeInput } from "@/lib/validations/sanitized";

function RequiredAcceptance({ children, userId }: { children: ReactNode; userId: string }) {
  const { signOut } = useAuth();
  const query = useConfidentiality(userId);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const policy = query.data?.policy ?? null;
  const receipt = query.data?.receipt ?? null;
  const busy = saving || query.isFetching;
  useEffect(() => { setConfirmed(false); }, [policy?.id, policy?.body_sha256]);

  async function accept() {
    if (!policy || !canAcceptConfidentiality(confirmed, policy, busy)) return;
    setSaving(true);
    setFailure(null);
    try {
      const { error } = await supabase.rpc("accept_confidentiality_policy", {
        p_policy_id: policy.id, p_policy_sha256: policy.body_sha256,
        p_confirmed: confirmed, p_user_agent: sanitizeInput(navigator.userAgent).slice(0, 500),
      });
      if (error) throw error;
      // Release only after reading the persisted receipt through RLS.
      const result = await query.refetch();
      if (!hasCurrentAcceptance(result.data?.policy ?? null, result.data?.receipt ?? null, userId)) {
        throw new Error("Receipt unavailable");
      }
    } catch {
      setFailure("Não foi possível confirmar seu aceite. Tente novamente; se o texto mudou, leia a nova versão.");
      setConfirmed(false);
      await query.refetch();
    } finally {
      setSaving(false);
    }
  }

  if (!query.isError && hasCurrentAcceptance(policy, receipt, userId)) return <>{children}</>;

  return <div className="min-h-screen bg-background">
    <Dialog open>
      <DialogContent hideCloseButton className="w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] flex flex-col gap-4"
        onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}>
        <DialogHeader className="shrink-0">
          <ShieldCheck className="h-7 w-7 text-primary mb-2" />
          <DialogTitle className="leading-snug">Compromisso de confidencialidade</DialogTitle>
          <DialogDescription>Antes de acessar, confirme os deveres de sigilo e proteção das informações dos clientes.</DialogDescription>
        </DialogHeader>
        {query.isPending && <div className="py-8 flex justify-center" role="status"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="sr-only">Carregando compromisso</span></div>}
        {query.isError ? <div role="alert" className="text-sm text-destructive">Não foi possível consultar o compromisso. O acesso permanece bloqueado até a verificação.</div> : policy && <>
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 text-sm text-muted-foreground">
            <span>Versão {policy.version} · {new Date(policy.published_at).toLocaleDateString("pt-BR")}</span>
            <Button variant="ghost" size="sm" onClick={() => downloadConfidentiality(policy)}><Download className="h-4 w-4 mr-2" />Baixar texto</Button>
          </div>
          <div tabIndex={0} aria-label="Texto integral do compromisso" className="overflow-y-auto min-h-0 border rounded-md p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">{policy.body}</div>
          <label className="flex gap-3 items-start text-sm leading-relaxed shrink-0 cursor-pointer" key={policy.id}>
            <Checkbox className="mt-1" checked={confirmed} disabled={busy} onCheckedChange={value => setConfirmed(value === true)} />
            <span>Li e compreendi a versão {policy.version} e assumo os deveres de confidencialidade e uso autorizado das informações.</span>
          </label>
          <p className="text-xs text-muted-foreground shrink-0">Seu aceite será registrado para sua conta, com versão do texto e data e hora. Ele não afasta responsabilidades legais da Impéria.</p>
        </>}
        {failure && <p role="alert" className="text-sm text-destructive shrink-0">{failure}</p>}
        <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 shrink-0">
          <Button variant="outline" disabled={saving} onClick={() => void signOut()}><LogOut className="h-4 w-4 mr-2" />Não concordo — sair</Button>
          {query.isError ? <Button disabled={busy} onClick={() => void query.refetch()}>Tentar novamente</Button> :
            <Button disabled={!canAcceptConfidentiality(confirmed, policy, busy)} onClick={() => void accept()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{saving ? "Registrando aceite…" : "Aceitar e continuar"}
            </Button>}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}

export function ConfidentialityGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (!requiresConfidentiality(pathname)) return <>{children}</>;
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center" role="status"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="sr-only">Verificando acesso</span></div>;
  if (!user) return <>{children}</>;
  return <RequiredAcceptance key={user.id} userId={user.id}>{children}</RequiredAcceptance>;
}