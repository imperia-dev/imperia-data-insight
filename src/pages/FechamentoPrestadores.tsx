import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePageLayout } from "@/hooks/usePageLayout";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtocolosIndividuaisTab } from "@/components/fechamentoPrestadores/ProtocolosIndividuaisTab";
import { ProtocoloConsolidadoTab } from "@/components/fechamentoPrestadores/ProtocoloConsolidadoTab";
import { WorkflowAtrasoTab } from "@/components/fechamentoPrestadores/WorkflowAtrasoTab";
import { FileSpreadsheet, GitMerge, AlertTriangle } from "lucide-react";

export default function FechamentoPrestadores() {
  const { mainContainerClass } = usePageLayout();
  const { userRole } = useRoleAccess('/fechamento-prestadores');
  const [activeTab, setActiveTab] = useState("individuais");

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName="" userRole={userRole} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Fechamento de Prestadores
              </h1>
              <p className="text-muted-foreground mt-2">
                Gestão de protocolos individuais, consolidados e workflow de aprovação
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="individuais" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Protocolos Individuais
                </TabsTrigger>
                <TabsTrigger value="consolidado" className="flex items-center gap-2">
                  <GitMerge className="h-4 w-4" />
                  Protocolo Consolidado
                </TabsTrigger>
                <TabsTrigger value="workflow" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Workflow & Atrasos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="individuais" className="space-y-4">
                <ProtocolosIndividuaisTab />
              </TabsContent>

              <TabsContent value="consolidado" className="space-y-4">
                <ProtocoloConsolidadoTab />
              </TabsContent>

              <TabsContent value="workflow" className="space-y-4">
                <WorkflowAtrasoTab />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
