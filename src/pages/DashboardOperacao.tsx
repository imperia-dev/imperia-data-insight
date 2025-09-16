import { usePageLayout } from "@/hooks/usePageLayout";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { useConstructionPage } from "@/hooks/useConstructionPage";

export default function DashboardOperacao() {
  const { userRole, userName, mainContainerClass } = useConstructionPage();

  const stats = [
    {
      title: "Pedidos em Processamento",
      value: "24",
      description: "Aguardando ação",
      icon: ShoppingCart,
      change: "+12%",
    },
    {
      title: "Pedidos Entregues Hoje",
      value: "142",
      description: "Finalizados com sucesso",
      icon: Package,
      change: "+8%",
    },
    {
      title: "Taxa de Conclusão",
      value: "94.5%",
      description: "Média semanal",
      icon: TrendingUp,
      change: "+2.3%",
    },
    {
      title: "Comissões do Mês",
      value: "R$ 4.250",
      description: "Acumulado",
      icon: Wallet,
      change: "+15%",
    },
  ];

  return (
    <div className={mainContainerClass}>
      <SidebarTrigger className="mb-4" />
      
      <div className="container mx-auto px-4 pt-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Operação</h1>
          <p className="text-muted-foreground mt-2">
            Bem-vindo, {userName}! Acompanhe suas métricas operacionais.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="text-xs text-green-600 mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
              <CardDescription>
                Últimas ações realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pedido #1234 entregue</p>
                    <p className="text-xs text-muted-foreground">Há 5 minutos</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Concluído</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pedido #1235 em processamento</p>
                    <p className="text-xs text-muted-foreground">Há 15 minutos</p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Em andamento</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pedido #1233 entregue</p>
                    <p className="text-xs text-muted-foreground">Há 1 hora</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Concluído</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metas do Mês</CardTitle>
              <CardDescription>
                Progresso das suas metas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Entregas</span>
                    <span className="text-sm text-muted-foreground">850/1000</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "85%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Taxa de Sucesso</span>
                    <span className="text-sm text-muted-foreground">94.5%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: "94.5%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Satisfação Cliente</span>
                    <span className="text-sm text-muted-foreground">4.8/5.0</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: "96%" }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}