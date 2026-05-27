import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrialCustomer } from "../TrialPortalGuard";
import { useTrialUsage } from "../lib/useTrialUsage";

export function TrialUsageChip({ className }: { className?: string }) {
  const { customer } = useTrialCustomer();
  const { usage, loading } = useTrialUsage(customer?.id);

  if (loading || !usage) return null;

  const docsPct = usage.docs_limit > 0 ? (usage.docs_used / usage.docs_limit) * 100 : 0;
  const pagesPct = usage.pages_limit > 0 ? (usage.pages_used / usage.pages_limit) * 100 : 0;
  const maxPct = Math.min(100, Math.max(docsPct, pagesPct));
  const variant: "ok" | "warn" | "block" = usage.blocked ? "block" : maxPct >= 80 ? "warn" : "ok";

  const tone =
    variant === "block"
      ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
      : variant === "warn"
      ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200"
      : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200";

  const Icon = variant === "block" ? AlertTriangle : variant === "warn" ? AlertTriangle : CheckCircle2;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            tone,
            className,
          )}
          aria-label="Limite do período trial"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>
            {usage.docs_used}/{usage.docs_limit} docs · {usage.pages_used}/{usage.pages_limit} págs
          </span>
          {variant === "block" && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">Limite</Badge>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <Icon className={cn("h-4 w-4 mt-0.5", variant === "block" ? "text-destructive" : variant === "warn" ? "text-amber-600" : "text-emerald-600")} />
            <div className="flex-1">
              <div className="font-semibold text-sm">Período trial</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {variant === "block"
                  ? "Você atingiu o limite do período de testes."
                  : `No trial você pode enviar até ${usage.docs_limit} documentos de ${usage.pages_per_doc_limit} páginas ou 1 único documento de até ${usage.single_doc_pages_limit} páginas.`}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Documentos</span>
              <span className="font-medium">{usage.docs_used} / {usage.docs_limit}</span>
            </div>
            <Progress value={Math.min(100, docsPct)} className="h-1.5" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Páginas totais</span>
              <span className="font-medium">{usage.pages_used} / {usage.pages_limit}</span>
            </div>
            <Progress value={Math.min(100, pagesPct)} className="h-1.5" />
          </div>

          <div className="text-[11px] text-muted-foreground border-t pt-2">
            Bloqueia quando atingir {usage.docs_limit} documentos <strong>ou</strong> {usage.pages_limit} páginas no total. Pedidos já em andamento continuam normalmente.
          </div>
          <a
            href="mailto:contato@imperiatraducoes.com.br?subject=Aumentar%20limite%20do%20trial"
            className="block text-xs font-semibold text-primary hover:underline"
          >
            Precisa de mais? Falar com a equipe →
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
