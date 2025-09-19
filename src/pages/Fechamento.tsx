import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileUp, TrendingUp, Package, FileText, Calculator, CheckCircle, Copy, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Papa from "papaparse";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/currency";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database['public']['Enums']['user_role'];

interface CSVData {
  id: string;
  pages: number;
}

interface AnalysisData {
  totalIds: number;
  totalPages: number;
  totalValue: number;
  avgValuePerDocument: number;
  product1Count: number; // <= 4 pages
  product2Count: number; // > 4 pages
  documents: CSVData[];
}

export default function Fechamento() {
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [protocol, setProtocol] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"upload" | "preview" | "protocol">("upload");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [competenceMonth, setCompetenceMonth] = useState(format(new Date(), "yyyy-MM"));
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("operation");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setUserName(profile.full_name);
          setUserRole(profile.role as UserRole);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        try {
          const parsedData: CSVData[] = [];
          
          // Parse CSV data (A column = ID, C column = pages)
          results.data.forEach((row: any, index) => {
            if (index === 0) return; // Skip header
            if (row[0] && row[2]) {
              parsedData.push({
                id: row[0].toString().trim(),
                pages: parseInt(row[2]) || 0
              });
            }
          });

          if (parsedData.length === 0) {
            toast({
              title: "Erro",
              description: "Nenhum dado válido encontrado no arquivo CSV",
              variant: "destructive"
            });
            return;
          }

          setCsvData(parsedData);
          analyzeData(parsedData);
          
          toast({
            title: "Sucesso",
            description: `${parsedData.length} documentos carregados para análise`,
          });
        } catch (error) {
          toast({
            title: "Erro",
            description: "Erro ao processar arquivo CSV",
            variant: "destructive"
          });
        }
      },
      error: (error) => {
        toast({
          title: "Erro",
          description: "Erro ao ler arquivo CSV",
          variant: "destructive"
        });
      }
    });
  };

  const analyzeData = (data: CSVData[]) => {
    const totalIds = data.length;
    const totalPages = data.reduce((sum, doc) => sum + doc.pages, 0);
    
    // Calculate values based on rules
    let totalValue = 0;
    let product1Count = 0;
    let product2Count = 0;

    data.forEach(doc => {
      if (doc.pages <= 4) {
        totalValue += 50; // R$ 50 for documents <= 4 pages
        product1Count++;
      } else {
        totalValue += 30; // R$ 30 for documents > 4 pages
        product2Count++;
      }
    });

    const avgValuePerDocument = totalValue / totalIds;

    setAnalysisData({
      totalIds,
      totalPages,
      totalValue,
      avgValuePerDocument,
      product1Count,
      product2Count,
      documents: data
    });

    setCurrentStep("preview");
  };

  const handleSubmitAgain = () => {
    setCsvData([]);
    setAnalysisData(null);
    setCurrentStep("upload");
    
    // Reset file input
    const fileInput = document.getElementById("csv-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleConfirm = () => {
    setShowConfirmDialog(true);
  };

  const generateProtocol = async () => {
    if (!analysisData) return;

    setIsLoading(true);
    try {
      // Get the count of protocols for this month to generate sequence
      const { count } = await supabase
        .from("closing_protocols")
        .select("*", { count: 'exact', head: true })
        .gte("competence_month", `${competenceMonth}-01`)
        .lt("competence_month", `${format(new Date(competenceMonth + "-01").setMonth(new Date(competenceMonth + "-01").getMonth() + 1), "yyyy-MM")}-01`);

      const sequence = ((count || 0) + 1).toString().padStart(2, "0");
      const protocolNumber = `${competenceMonth}-comp-${sequence}`;

      // Save to database
      const { error } = await supabase
        .from("closing_protocols")
        .insert({
          protocol_number: protocolNumber,
          competence_month: `${competenceMonth}-01`,
          total_ids: analysisData.totalIds,
          total_pages: analysisData.totalPages,
          total_value: analysisData.totalValue,
          avg_value_per_document: analysisData.avgValuePerDocument,
          product_1_count: analysisData.product1Count,
          product_2_count: analysisData.product2Count,
          document_data: analysisData.documents as any, // Cast to any for JSON type
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        throw error;
      }

      setProtocol(protocolNumber);
      setCurrentStep("protocol");
      setShowConfirmDialog(false);
      
      toast({
        title: "Protocolo gerado",
        description: `Protocolo ${protocolNumber} criado com sucesso`,
      });
    } catch (error) {
      console.error("Error generating protocol:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar protocolo",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyProtocol = () => {
    navigator.clipboard.writeText(protocol);
    toast({
      title: "Protocolo copiado",
      description: "Protocolo copiado para a área de transferência",
    });
  };

  const goToFinancialDashboard = () => {
    navigate("/dashboard-financeiro");
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar userRole={userRole} />
        <div className="flex-1 flex flex-col">
          <Header userName={userName} userRole={userRole} />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="container mx-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-primary">Fechamento</h1>
                  <p className="text-muted-foreground">Análise de dados pré-fechamento</p>
                </div>
              </div>

              {currentStep === "upload" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Upload de Arquivo CSV</CardTitle>
                    <CardDescription>
                      Faça upload do arquivo CSV com os dados dos documentos (Coluna A: ID, Coluna C: Páginas)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 hover:border-primary/50 transition-colors">
                      <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <span className="text-primary font-medium hover:underline">Clique para selecionar</span>
                        <span className="text-muted-foreground"> ou arraste o arquivo CSV aqui</span>
                      </label>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    <Alert>
                      <AlertDescription>
                        O arquivo CSV deve conter:
                        <ul className="list-disc list-inside mt-2">
                          <li>Coluna A: ID do documento</li>
                          <li>Coluna C: Quantidade de páginas traduzidas</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {currentStep === "preview" && analysisData && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Análise dos Dados</CardTitle>
                      <CardDescription>
                        Revise os dados calculados antes de confirmar o fechamento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-muted-foreground">Total de IDs</span>
                            </div>
                            <p className="text-2xl font-bold">{analysisData.totalIds}</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-muted-foreground">Total de Páginas</span>
                            </div>
                            <p className="text-2xl font-bold">{analysisData.totalPages}</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-muted-foreground">Valor Total</span>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(analysisData.totalValue)}</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                              <Calculator className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-muted-foreground">Média por Documento</span>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(analysisData.avgValuePerDocument)}</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-muted-foreground">Produto 1 (≤4 páginas)</span>
                            </div>
                            <p className="text-2xl font-bold">{analysisData.product1Count}</p>
                            <p className="text-sm text-muted-foreground">R$ 50,00/doc</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-muted-foreground">Produto 2 (&gt;4 páginas)</span>
                            </div>
                            <p className="text-2xl font-bold">{analysisData.product2Count}</p>
                            <p className="text-sm text-muted-foreground">R$ 30,00/doc</p>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Detalhamento dos Documentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID do Documento</TableHead>
                              <TableHead>Páginas</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {analysisData.documents.map((doc, index) => (
                              <TableRow key={index}>
                                <TableCell>{doc.id}</TableCell>
                                <TableCell>{doc.pages}</TableCell>
                                <TableCell>{doc.pages <= 4 ? "Produto 1" : "Produto 2"}</TableCell>
                                <TableCell>{formatCurrency(doc.pages <= 4 ? 50 : 30)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    <Button onClick={handleSubmitAgain} variant="outline" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Enviar Novamente
                    </Button>
                    <Button onClick={handleConfirm} className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Confirmar Fechamento
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === "protocol" && protocol && (
                <Card>
                  <CardHeader>
                    <CardTitle>Protocolo de Fechamento Gerado</CardTitle>
                    <CardDescription>
                      Use este protocolo para adicionar a receita no Dashboard Financeiro
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-muted/50 rounded-lg p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-2">Protocolo de Fechamento</p>
                      <p className="text-3xl font-mono font-bold text-primary">{protocol}</p>
                    </div>

                    <div className="flex gap-4 justify-center">
                      <Button onClick={copyProtocol} variant="outline" className="gap-2">
                        <Copy className="h-4 w-4" />
                        Copiar Protocolo
                      </Button>
                      <Button onClick={goToFinancialDashboard} className="gap-2">
                        Ir para Dashboard Financeiro
                      </Button>
                    </div>

                    <Alert>
                      <AlertDescription>
                        <strong>Próximos passos:</strong>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Copie o protocolo acima</li>
                          <li>Acesse o Dashboard Financeiro</li>
                          <li>Clique em "Adicionar Receita"</li>
                          <li>Insira o protocolo no campo correspondente</li>
                          <li>O valor será preenchido automaticamente</li>
                          <li>Complete os demais campos e salve</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Fechamento</DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja confirmar este fechamento? Um protocolo será gerado e os dados serão salvos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Resumo do Fechamento</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm">Total de Documentos: <strong>{analysisData?.totalIds}</strong></p>
                <p className="text-sm">Valor Total: <strong>{formatCurrency(analysisData?.totalValue || 0)}</strong></p>
                <p className="text-sm">Competência: <strong>{format(new Date(competenceMonth + "-01"), "MM/yyyy")}</strong></p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={generateProtocol} disabled={isLoading}>
              {isLoading ? "Gerando..." : "Confirmar e Gerar Protocolo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}