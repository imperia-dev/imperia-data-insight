import { Link } from "react-router-dom";
import { Download, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useConfidentiality } from "@/hooks/useConfidentiality";
import { downloadConfidentiality } from "@/lib/confidentiality";

export default function ConfidentialityPolicyPage() {
  const { user } = useAuth();
  const { data, isPending, isError, refetch } = useConfidentiality(user?.id);
  return <main className="min-h-screen bg-background">
    <div className="mx-auto max-w-3xl px-5 py-8 space-y-6">
      <Button variant="ghost" asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Voltar ao sistema</Link></Button>
      <header className="space-y-3"><ShieldCheck className="h-8 w-8 text-primary" /><h1 className="text-3xl font-bold leading-tight">Confidencialidade e acesso a informações</h1></header>
      {isPending && <Loader2 role="status" aria-label="Carregando compromisso" className="h-6 w-6 animate-spin text-primary" />}
      {isError && <div role="alert"><p>Não foi possível carregar o compromisso.</p><Button onClick={() => void refetch()} variant="outline" className="mt-3">Tentar novamente</Button></div>}
      {data && <>
        <p className="text-sm text-muted-foreground">Versão {data.policy.version} · Publicação em {new Date(data.policy.published_at).toLocaleDateString("pt-BR")}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => downloadConfidentiality(data.policy)}><Download className="h-4 w-4 mr-2" />Baixar compromisso</Button>
          {data.receipt && <Button onClick={() => downloadConfidentiality(data.policy, data.receipt)}><Download className="h-4 w-4 mr-2" />Baixar meu comprovante</Button>}
        </div>
        {data.receipt && <p className="text-sm text-primary">Aceito em {new Date(data.receipt.accepted_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília).</p>}
        <article className="whitespace-pre-wrap break-words text-sm leading-7">{data.policy.body}</article>
        <p className="text-xs text-muted-foreground break-all">SHA-256 do texto: {data.policy.body_sha256}</p>
        <nav className="flex flex-wrap gap-5 text-sm text-primary"><Link to="/terms-of-service">Termos de Serviço</Link><Link to="/privacy-policy">Política de Privacidade</Link></nav>
      </>}
    </div>
  </main>;
}