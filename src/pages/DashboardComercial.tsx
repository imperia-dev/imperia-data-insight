import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useConstructionPage } from "@/hooks/useConstructionPage";

export default function DashboardComercial() {
  const { userRole, userName, mainContainerClass } = useConstructionPage();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-foreground">Dashboard Comercial</h1>
          
          <Card className="max-w-2xl mx-auto mt-12">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Construction className="h-6 w-6 text-primary" />
                Página em Construção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Esta página está sendo desenvolvida e estará disponível em breve.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}