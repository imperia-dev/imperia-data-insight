import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PortalLayout } from "../PortalLayout";
import { FileText, Globe2, ShieldCheck, Sparkles } from "lucide-react";

export default function PortalLanding() {
  return (
    <PortalLayout>
      <section className="max-w-4xl mx-auto text-center py-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/30 px-4 py-1.5 text-xs font-medium text-accent-foreground mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Versão de teste gratuita
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          Tradução juramentada PT ↔ IT
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Crie seu cadastro, envie seus documentos e acompanhe seus pedidos em um portal exclusivo.
          Nossa equipe analisa cada novo cadastro e libera o acesso para você começar.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/portal/cadastro">Criar minha conta</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/portal/login">Já tenho conta</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 max-w-5xl mx-auto mt-8">
        {[
          { icon: Globe2, title: "PT ↔ IT", desc: "Português e italiano com qualidade certificada." },
          { icon: FileText, title: "Análise automática", desc: "Contagem de páginas, documentos e caracteres." },
          { icon: ShieldCheck, title: "Seguro e privado", desc: "Seus arquivos ficam isolados e criptografados." },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="border-border/60">
            <CardContent className="pt-6">
              <Icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </PortalLayout>
  );
}
