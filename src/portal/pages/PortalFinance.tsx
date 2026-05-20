import { Fragment, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  FileText,
  CheckCircle2,
  BarChart3,
  DollarSign,
  Wallet,
  Clock,
  TrendingUp,
  Layers,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrialCustomer } from "../TrialPortalGuard";
import { formatCurrency } from "@/lib/currency";
import { FLAT_PRICE, PAGE_PRICE, FLAT_PAGE_LIMIT, priceForDocument, priceForOrder } from "../lib/pricing";

type OrderFile = {
  id: string;
  original_filename: string | null;
  pages: number | null;
  characters: number | null;
};

type Order = {
  id: string;
  order_number: string;
  language_pair: string | null;
  status: string;
  total_documents: number | null;
  total_pages: number | null;
  total_characters: number | null;
  created_at: string;
  trial_order_files: OrderFile[] | null;
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "outline" },
  submitted: { label: "Enviado", variant: "default" },
  processing: { label: "Em processamento", variant: "secondary" },
  completed: { label: "Concluído", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const IN_PROGRESS = new Set(["submitted", "processing"]);

export default function PortalFinance() {
  const { customer } = useTrialCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!customer) return;
    (async () => {
      const { data } = await supabase
        .from("trial_orders")
        .select(
          "id, order_number, status, language_pair, total_documents, total_pages, total_characters, created_at, trial_order_files(id, original_filename, pages, characters)",
        )
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      setOrders((data as unknown as Order[]) ?? []);
      setLoading(false);
    })();
  }, [customer]);

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    const inProgress = orders.filter((o) => IN_PROGRESS.has(o.status));
    const totalPages = orders.reduce((acc, o) => acc + (o.total_pages || 0), 0);
    const totalChars = orders.reduce((acc, o) => acc + (o.total_characters || 0), 0);
    const totalDocs = orders.reduce(
      (acc, o) => acc + (o.total_documents || o.trial_order_files?.length || 0),
      0,
    );

    const costByOrder = new Map<string, number>();
    let totalValue = 0;
    let billedValue = 0;
    let openValue = 0;

    for (const o of orders) {
      const v = priceForOrder(o.trial_order_files ?? []);
      costByOrder.set(o.id, v);
      totalValue += v;
      if (o.status === "completed") billedValue += v;
      if (IN_PROGRESS.has(o.status)) openValue += v;
    }

    const avgTicket = orders.length ? totalValue / orders.length : 0;
    const avgPerPage = totalPages ? totalValue / totalPages : 0;

    return {
      completed: completed.length,
      inProgress: inProgress.length,
      totalPages,
      totalChars,
      totalDocs,
      totalValue,
      billedValue,
      openValue,
      avgTicket,
      avgPerPage,
      costByOrder,
    };
  }, [orders]);

  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">
          Resumo de consumo e valores estimados dos seus pedidos.
        </p>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPIs principais */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi icon={<FileText className="h-4 w-4" />} label="Pedidos no total" value={orders.length} />
            <Kpi
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Pedidos concluídos"
              value={stats.completed}
            />
            <Kpi icon={<Clock className="h-4 w-4" />} label="Em andamento" value={stats.inProgress} />
            <Kpi icon={<Layers className="h-4 w-4" />} label="Documentos enviados" value={stats.totalDocs} />
            <Kpi
              icon={<BarChart3 className="h-4 w-4" />}
              label="Páginas traduzidas"
              value={stats.totalPages}
              subtitle={`${stats.totalChars.toLocaleString("pt-BR")} caracteres`}
            />
            <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Valor total estimado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{formatCurrency(stats.totalValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">Soma de todos os pedidos</p>
              </CardContent>
            </Card>
          </div>

          {/* KPIs secundários */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<Wallet className="h-4 w-4" />}
              label="Já faturado"
              value={formatCurrency(stats.billedValue)}
              subtitle="Pedidos concluídos"
            />
            <Kpi
              icon={<Clock className="h-4 w-4" />}
              label="Em aberto"
              value={formatCurrency(stats.openValue)}
              subtitle="Enviados / em processamento"
            />
            <Kpi
              icon={<TrendingUp className="h-4 w-4" />}
              label="Ticket médio"
              value={formatCurrency(stats.avgTicket)}
              subtitle="Por pedido"
            />
            <Kpi
              icon={<BarChart3 className="h-4 w-4" />}
              label="Preço médio / página"
              value={formatCurrency(stats.avgPerPage)}
            />
          </div>

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum pedido registrado ainda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground border-b">
                      <tr>
                        <th className="py-2 pr-4 w-8"></th>
                        <th className="py-2 pr-4">Pedido</th>
                        <th className="py-2 pr-4">Idioma</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4 text-right">Docs</th>
                        <th className="py-2 pr-4 text-right">Páginas</th>
                        <th className="py-2 pr-4 text-right">Caracteres</th>
                        <th className="py-2 pr-4 text-right">Valor</th>
                        <th className="py-2 pr-4">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const s = statusLabels[o.status] ?? { label: o.status, variant: "outline" as const };
                        const lang =
                          o.language_pair === "pt-it"
                            ? "PT → IT"
                            : o.language_pair === "it-pt"
                            ? "IT → PT"
                            : o.language_pair ?? "—";
                        const value = stats.costByOrder.get(o.id) ?? 0;
                        const files = o.trial_order_files ?? [];
                        const isOpen = !!expanded[o.id];
                        return (
                          <>
                            <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-3 pr-2">
                                {files.length > 0 && (
                                  <button
                                    onClick={() => toggle(o.id)}
                                    aria-label={isOpen ? "Recolher" : "Expandir"}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    {isOpen ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                              </td>
                              <td className="py-3 pr-4 font-medium">{o.order_number}</td>
                              <td className="py-3 pr-4">{lang}</td>
                              <td className="py-3 pr-4">
                                <Badge variant={s.variant}>{s.label}</Badge>
                              </td>
                              <td className="py-3 pr-4 text-right">
                                {o.total_documents || files.length}
                              </td>
                              <td className="py-3 pr-4 text-right">{o.total_pages || 0}</td>
                              <td className="py-3 pr-4 text-right">
                                {(o.total_characters || 0).toLocaleString("pt-BR")}
                              </td>
                              <td className="py-3 pr-4 text-right font-medium">
                                {formatCurrency(value)}
                              </td>
                              <td className="py-3 pr-4 whitespace-nowrap">
                                {new Date(o.created_at).toLocaleDateString("pt-BR")}
                              </td>
                            </tr>
                            {isOpen && files.length > 0 && (
                              <tr key={`${o.id}-detail`} className="border-b last:border-0 bg-muted/20">
                                <td></td>
                                <td colSpan={8} className="py-3 pr-4">
                                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                                    Documentos deste pedido
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead className="text-muted-foreground">
                                        <tr>
                                          <th className="text-left py-1 pr-4">Arquivo</th>
                                          <th className="text-right py-1 pr-4">Páginas</th>
                                          <th className="text-right py-1 pr-4">Caracteres</th>
                                          <th className="text-right py-1 pr-4">Regra</th>
                                          <th className="text-right py-1 pr-4">Valor</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {files.map((f) => {
                                          const p = f.pages ?? 0;
                                          const rule =
                                            p === 0
                                              ? "—"
                                              : p <= FLAT_PAGE_LIMIT
                                              ? `Fixo (até ${FLAT_PAGE_LIMIT} págs.)`
                                              : `${p} × ${formatCurrency(PAGE_PRICE)}`;
                                          return (
                                            <tr key={f.id} className="border-t border-muted">
                                              <td className="py-2 pr-4">
                                                {f.original_filename || "documento"}
                                              </td>
                                              <td className="py-2 pr-4 text-right">{p}</td>
                                              <td className="py-2 pr-4 text-right">
                                                {(f.characters ?? 0).toLocaleString("pt-BR")}
                                              </td>
                                              <td className="py-2 pr-4 text-right text-muted-foreground">
                                                {rule}
                                              </td>
                                              <td className="py-2 pr-4 text-right font-medium">
                                                {formatCurrency(priceForDocument(p))}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-medium">
                        <td></td>
                        <td className="py-3 pr-4" colSpan={3}>
                          Totais
                        </td>
                        <td className="py-3 pr-4 text-right">{stats.totalDocs}</td>
                        <td className="py-3 pr-4 text-right">{stats.totalPages}</td>
                        <td className="py-3 pr-4 text-right">
                          {stats.totalChars.toLocaleString("pt-BR")}
                        </td>
                        <td className="py-3 pr-4 text-right text-primary">
                          {formatCurrency(stats.totalValue)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transparência de preço */}
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Como o valor é calculado</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>
                      Documentos com até {FLAT_PAGE_LIMIT} páginas: valor fixo de{" "}
                      <strong>{formatCurrency(FLAT_PRICE)}</strong> por documento.
                    </li>
                    <li>
                      Documentos com {FLAT_PAGE_LIMIT + 1} páginas ou mais: número de páginas ×{" "}
                      <strong>{formatCurrency(PAGE_PRICE)}</strong>.
                    </li>
                    <li>
                      O cálculo é feito por documento, somando-se cada arquivo individualmente.
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground pt-1">
                    Os valores apresentados são estimativas com base na análise automática dos documentos
                    enviados e podem ser ajustados pela equipe Império antes da emissão da fatura final.
                  </p>
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm">
                      <a href="/portal/app/pedidos">Ver pedidos</a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
