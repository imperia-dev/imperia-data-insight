import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function AIAnalytics() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-foreground">AI Analytics</h1>
      
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
    </div>
  );
}