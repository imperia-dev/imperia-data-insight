import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus, Loader2, FileText, Activity, CheckCircle2, ArrowRight,
  Files, Languages, Clock, FileCheck2, TrendingUp, Sparkles, FilePen, Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrialCustomer } from "../TrialPortalGuard";
import { useTrialUsage } from "../lib/useTrialUsage";
import { Progress } from "@/components/ui/progress";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

type Order = {
  id: string;
  order_number: string;
  customer_reference: string | null;
  status: string;
  processing_step: number | null;
  created_at: string;
  submitted_at: string | null;
  language_pair: string | null;
  translation_type: string | null;
  total_documents: number | null;
  total_pages: number | null;
  total_characters: number | null;
  external_link: string | null;
  external_id: string | null;
};

import { STATUS_LABEL, CUSTOMER_TIMELINE, PROCESSING_TOTAL } from "@/portal/lib/orderStatus";

const STATUS_COLOR: Record<string, string> = {
  draft: "hsl(var(--muted-foreground))",
  submitted: "hsl(var(--primary))",
  accepted: "hsl(var(--chart-3, 47 96% 53%))",
  processing: "hsl(var(--chart-2, 217 91% 60%))",
  completed: "hsl(142 71% 45%)",
  delivered: "hsl(142 71% 45%)",
  received: "hsl(142 71% 45%)",
  cancelled: "hsl(var(--destructive))",
};

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "completed" ? "default" :
    status === "submitted" || status === "processing" ? "secondary" :
    status === "cancelled" ? "destructive" : "outline";
  return <Badge variant={variant as any}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export default function PortalDashboard() {
  const { customer } = useTrialCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    (async () => {
      const { data } = await supabase
        .from("trial_orders")
        .select("id, order_number, customer_reference, status, processing_step, created_at, submitted_at, language_pair, translation_type, total_documents, total_pages, total_characters, external_link, external_id")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, [customer]);

  const stats = useMemo(() => {
    const total = orders.length;
    const drafts = orders.filter((o) => o.status === "draft").length;
    const submitted = orders.filter((o) => o.status === "submitted").length;
    const inProgress = orders.filter((o) => ["submitted", "processing"].includes(o.status)).length;
    const completed = orders.filter((o) => o.status === "completed").length;
    const totalDocs = orders.reduce((s, o) => s + (o.total_documents ?? 0), 0);
    const totalPages = orders.reduce((s, o) => s + (o.total_pages ?? 0), 0);
    const totalChars = orders.reduce((s, o) => s + (o.total_characters ?? 0), 0);
    const langs = new Set(orders.map((o) => o.language_pair).filter(Boolean) as string[]);
    return { total, drafts, submitted, inProgress, completed, totalDocs, totalPages, totalChars, languages: langs.size };
  }, [orders]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: STATUS_LABEL[k] ?? k, value: v, key: k }));
  }, [orders]);

  const monthlyData = useMemo(() => {
    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      buckets.push({
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM", { locale: ptBR }),
        count: 0,
      });
    }
    orders.forEach((o) => {
      const k = format(new Date(o.created_at), "yyyy-MM");
      const b = buckets.find((x) => x.key === k);
      if (b) b.count += 1;
    });
    return buckets;
  }, [orders]);

  const last = orders[0];
  const recent = orders.slice(0, 5);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Portal Impéria
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Olá, {customer?.full_name.split(" ")[0]} 👋
            </h1>
            <p className="text-muted-foreground max-w-lg">
              Aqui está um resumo completo das suas traduções. Acompanhe o andamento, volumes e histórico em um só lugar.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="lg">
              <Link to="/portal/app/pedidos"><FileText className="h-4 w-4 mr-2" /> Meus pedidos</Link>
            </Button>
            <Button asChild size="lg" className="shadow-lg shadow-primary/20">
              <Link to="/portal/app/novo"><Plus className="h-4 w-4 mr-2" /> Novo pedido</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <TooltipProvider delayDuration={150}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={<FileText className="h-4 w-4" />} label="Total de pedidos" value={stats.total} hint={`${stats.drafts} rascunho${stats.drafts === 1 ? "" : "s"}`}
            items={orders} />
          <KpiCard icon={<Activity className="h-4 w-4" />} label="Em andamento" value={stats.inProgress} hint={`${stats.submitted} enviado${stats.submitted === 1 ? "" : "s"}`} accent
            items={orders.filter(o => ["submitted", "processing"].includes(o.status))} />
          <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Concluídos" value={stats.completed} hint={stats.total ? `${Math.round((stats.completed / stats.total) * 100)}% do total` : "—"}
            items={orders.filter(o => o.status === "completed")} />
          <KpiCard icon={<Languages className="h-4 w-4" />} label="Idiomas" value={stats.languages} hint="Pares solicitados"
            groups={Array.from(new Set(orders.map(o => o.language_pair).filter(Boolean) as string[])).map(lp => ({
              title: lp,
              items: orders.filter(o => o.language_pair === lp),
            }))} />
        </div>

        {/* Volume */}
        <div className="grid gap-4 sm:grid-cols-3 mt-4">
          <KpiCard icon={<Files className="h-4 w-4" />} label="Documentos" value={stats.totalDocs} hint="Arquivos enviados" subtle
            items={orders.filter(o => (o.total_documents ?? 0) > 0)} metric="docs" />
          <KpiCard icon={<FileCheck2 className="h-4 w-4" />} label="Páginas" value={stats.totalPages} hint="Volume total" subtle
            items={orders.filter(o => (o.total_pages ?? 0) > 0)} metric="pages" />
          <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Caracteres" value={stats.totalChars.toLocaleString("pt-BR")} hint="Volume textual" subtle
            items={orders.filter(o => (o.total_characters ?? 0) > 0)} metric="chars" />
        </div>
      </TooltipProvider>

      {/* Pedidos por etapa */}
      <TooltipProvider delayDuration={150}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pedidos por etapa</CardTitle>
            <CardDescription>Quantos pedidos estão em cada fase do fluxo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              {CUSTOMER_TIMELINE.map((stage) => {
                const stageOrders = orders.filter((o) => o.status === stage.key);
                const count = stageOrders.length;
                const isProcessing = stage.key === "processing";
                const avgStep = isProcessing && count > 0
                  ? Math.round(
                      stageOrders.reduce((s, o: any) => s + Math.min(Math.max(o.processing_step ?? 1, 1), PROCESSING_TOTAL), 0) / count
                    )
                  : null;
                return (
                  <UITooltip key={stage.key}>
                    <TooltipTrigger asChild>
                      <Link
                        to={`/portal/app/pedidos?status=${stage.key}`}
                        className={`group rounded-lg border p-4 transition-all hover:border-primary/50 hover:shadow-sm ${count > 0 ? "bg-card" : "bg-muted/20"}`}
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                          {stage.label}
                        </div>
                        <div className={`text-3xl font-bold mt-2 ${count > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                          {count}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {count === 0
                            ? "Nenhum pedido"
                            : isProcessing && avgStep
                            ? `Etapa média ${avgStep}/${PROCESSING_TOTAL}`
                            : count === 1 ? "1 pedido" : `${count} pedidos`}
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs p-0">
                      <OrdersTooltipList title={stage.label} orders={stageOrders} />
                    </TooltipContent>
                  </UITooltip>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>






      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Pedidos por mês</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <EmptyChart text="Sem dados ainda" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="label" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Pedidos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Distribuição por status</CardTitle>
            <CardDescription>Pedidos por situação</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <EmptyChart text="Sem dados ainda" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLOR[entry.key] ?? "hsl(var(--muted-foreground))"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Pedidos recentes</CardTitle>
              <CardDescription>Seus 5 últimos pedidos</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/portal/app/pedidos">Ver todos <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                Você ainda não criou nenhum pedido.
              </div>
            ) : recent.map((o) => (
              <Link
                key={o.id}
                to={`/portal/app/pedido/${o.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.customer_reference || o.order_number}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {o.customer_reference && <span className="font-mono">{o.order_number}</span>}
                      <Clock className="h-3 w-3" />
                      {format(new Date(o.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      {o.language_pair && <span className="hidden sm:inline">· {o.language_pair}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={o.status} />
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações rápidas</CardTitle>
            <CardDescription>Atalhos para o dia a dia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction to="/portal/app/novo" icon={<Plus className="h-4 w-4" />} title="Criar novo pedido" desc="Envie documentos para tradução" />
            <QuickAction to="/portal/app/pedidos" icon={<FilePen className="h-4 w-4" />} title="Continuar rascunhos" desc={`${stats.drafts} aguardando envio`} />
            <QuickAction to="/portal/app/pedidos" icon={<Send className="h-4 w-4" />} title="Acompanhar envios" desc={`${stats.inProgress} em andamento`} />
            <QuickAction to="/portal/app/financeiro" icon={<TrendingUp className="h-4 w-4" />} title="Financeiro" desc="Faturas e pagamentos" />
          </CardContent>
        </Card>
      </div>

      {/* Last order highlight */}
      {last && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Último pedido</CardTitle>
              <CardDescription>Resumo do mais recente</CardDescription>
            </div>
            <Button asChild size="sm">
              <Link to={`/portal/app/pedido/${last.id}`}>Abrir <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={last.customer_reference ? "Referência" : "Número"} value={last.customer_reference || last.order_number} />
              <Field label="Status" value={<StatusBadge status={last.status} />} />
              <Field label="Idioma" value={last.language_pair ?? "—"} />
              <Field label="Documentos" value={String(last.total_documents ?? 0)} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type Metric = "docs" | "pages" | "chars";
type KpiGroup = { title: string; items: Order[] };

function metricValue(o: Order, m?: Metric): string {
  const v = m === "docs" ? (o.total_documents ?? 0) : m === "pages" ? (o.total_pages ?? 0) : m === "chars" ? (o.total_characters ?? 0) : 0;
  return m === "chars" ? v.toLocaleString("pt-BR") : String(v);
}

function OrderRow({ o, metric }: { o: Order; metric?: Metric }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs py-1">
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">{o.customer_reference || o.order_number}</div>
        <div className="text-muted-foreground truncate">
          {o.customer_reference && <span className="font-mono">{o.order_number} · </span>}
          {format(new Date(o.created_at), "dd/MM/yy", { locale: ptBR })}
          {o.language_pair ? ` · ${o.language_pair}` : ""}
        </div>
      </div>
      <div className="text-right shrink-0">
        {metric ? (
          <span className="font-semibold">{metricValue(o, metric)}</span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[o.status] ?? o.status}</span>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, hint, accent, subtle, items, groups, metric }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string;
  accent?: boolean; subtle?: boolean;
  items?: Order[]; groups?: KpiGroup[]; metric?: Metric;
}) {
  const card = (
    <Card className={`cursor-default transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 ${accent ? "border-primary/40 bg-primary/[0.03]" : subtle ? "bg-muted/30" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <span className={`h-8 w-8 rounded-md flex items-center justify-center ${accent ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>{icon}</span>
        </div>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );

  const hasItems = (items && items.length > 0) || (groups && groups.some(g => g.items.length > 0));
  if (!hasItems) return card;

  const MAX = 6;
  return (
    <UITooltip>
      <TooltipTrigger asChild><div>{card}</div></TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="p-3 w-[280px] max-h-[340px] overflow-auto">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
        {groups ? (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.title}>
                <div className="text-xs font-semibold mb-1 flex items-center justify-between">
                  <span>{g.title}</span>
                  <span className="text-muted-foreground">{g.items.length}</span>
                </div>
                <div className="divide-y divide-border/60">
                  {g.items.slice(0, MAX).map((o) => <OrderRow key={o.id} o={o} metric={metric} />)}
                </div>
                {g.items.length > MAX && (
                  <div className="text-[10px] text-muted-foreground mt-1">+ {g.items.length - MAX} pedido(s)</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/60">
              {items!.slice(0, MAX).map((o) => <OrderRow key={o.id} o={o} metric={metric} />)}
            </div>
            {items!.length > MAX && (
              <div className="text-[10px] text-muted-foreground mt-2">+ {items!.length - MAX} pedido(s)</div>
            )}
          </>
        )}
      </TooltipContent>
    </UITooltip>
  );
}


function OrdersTooltipList({ title, orders }: { title: string; orders: Order[] }) {
  const MAX = 8;
  return (
    <div className="p-3 w-[280px] max-h-[340px] overflow-auto">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between gap-2">
        <span className="truncate">{title}</span>
        <span>{orders.length}</span>
      </div>
      {orders.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">Nenhum pedido nesta etapa.</div>
      ) : (
        <>
          <div className="divide-y divide-border/60">
            {orders.slice(0, MAX).map((o) => <OrderRow key={o.id} o={o} />)}
          </div>
          {orders.length > MAX && (
            <div className="text-[10px] text-muted-foreground mt-2">+ {orders.length - MAX} pedido(s)</div>
          )}
        </>
      )}
    </div>
  );
}



function QuickAction({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 hover:border-primary/40 transition-colors group">
      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
}
