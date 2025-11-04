import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileUp, TrendingUp, Package, FileText, Calculator, CheckCircle, Copy, RefreshCw, History, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Papa from "papaparse";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/currency";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Database } from "@/integrations/supabase/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ProtocolStatusBadge } from "@/components/fechamentoPrestadores/ProtocolStatusBadge";

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
  const [showHistory, setShowHistory] = useState(false);
  const [closingHistory, setClosingHistory] = useState<any[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { mainContainerClass } = useSidebarOffset();

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
    fetchClosingHistory();
  }, []);

  const fetchClosingHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("closing_protocols")
        .select("*")
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setClosingHistory(data || []);
    } catch (error) {
      console.error("Error fetching closing history:", error);
    }
  };

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
      if (doc.pages <= 3) {
        totalValue += 50; // R$ 50 for documents with up to 3 pages
        product1Count++;
      } else {
        totalValue += doc.pages * 30; // R$ 30 per page for documents with 4+ pages
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
    setAttachmentFile(null);
    setCurrentStep("upload");
    
    // Reset file input
    const fileInput = document.getElementById("csv-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
      toast({
        title: "Arquivo selecionado",
        description: file.name,
      });
    }
  };

  const handleConfirm = () => {
    if (!attachmentFile) {
      toast({
        title: "Arquivo obrigatório",
        description: "É necessário anexar um arquivo antes de confirmar o fechamento",
        variant: "destructive",
      });
      return;
    }
    setShowConfirmDialog(true);
  };

  const generatePDF = async (protocolNumber: string): Promise<Blob> => {
    if (!analysisData) throw new Error("No analysis data");

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Fechamento de Receitas", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Protocolo: ${protocolNumber}`, 105, 30, { align: "center" });
    const competenceDate = new Date(`${competenceMonth}-01`);
    doc.text(`Competência: ${competenceDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 105, 38, { align: "center" });
    
    // Summary stats
    doc.setFontSize(14);
    doc.text("Resumo", 20, 50);
    
    doc.setFontSize(11);
    doc.text(`Total de IDs: ${analysisData.totalIds}`, 20, 60);
    doc.text(`Total de Páginas: ${analysisData.totalPages}`, 20, 68);
    doc.text(`Valor Total: ${formatCurrency(analysisData.totalValue)}`, 20, 76);
    doc.text(`Média por Documento: ${formatCurrency(analysisData.avgValuePerDocument)}`, 20, 84);
    doc.text(`Produto 1 (≤3 páginas): ${analysisData.product1Count} documentos`, 20, 92);
    doc.text(`Produto 2 (>3 páginas): ${analysisData.product2Count} documentos`, 20, 100);
    
    // Document details table
    doc.setFontSize(14);
    doc.text("Detalhamento dos Documentos", 20, 115);
    
    const tableData = analysisData.documents.map((doc: CSVData) => [
      doc.id,
      doc.pages.toString(),
      doc.pages <= 3 ? 'Produto 1' : 'Produto 2',
      formatCurrency(doc.pages <= 3 ? 50 : doc.pages * 30)
    ]);
    
    autoTable(doc, {
      startY: 120,
      head: [['ID do Documento', 'Páginas', 'Tipo', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
    });
    
    return doc.output('blob');
  };

  const generateProtocol = async () => {
    if (!analysisData || !attachmentFile) return;

    setIsLoading(true);
    try {
      const competenceDate = `${competenceMonth}-01`;
      
      // Generate protocol number using database function
      const { data: protocolNumberData, error: protocolError } = await supabase
        .rpc('generate_protocol_number', {
          p_type: 'revenue',
          p_competence_month: competenceDate
        });

      if (protocolError) {
        throw protocolError;
      }

      const protocolNumber = protocolNumberData;

      // Upload attachment file
      const fileExt = attachmentFile.name.split('.').pop();
      const fileName = `${protocolNumber}-${Date.now()}.${fileExt}`;
      const filePath = `closing/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, attachmentFile, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL for attachment
      const { data: { publicUrl: attachmentUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Generate PDF
      const pdfBlob = await generatePDF(protocolNumber);
      const pdfFileName = `${protocolNumber}.pdf`;
      const pdfFilePath = `closing/pdfs/${pdfFileName}`;

      const { error: pdfUploadError } = await supabase.storage
        .from('documents')
        .upload(pdfFilePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (pdfUploadError) throw pdfUploadError;

      // Get public URL for PDF
      const { data: { publicUrl: pdfUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(pdfFilePath);

      // Save to database
      const { error } = await supabase
        .from("closing_protocols")
        .insert({
          protocol_number: protocolNumber,
          competence_month: competenceDate,
          total_ids: analysisData.totalIds,
          total_pages: analysisData.totalPages,
          total_value: analysisData.totalValue,
          avg_value_per_document: analysisData.avgValuePerDocument,
          product_1_count: analysisData.product1Count,
          product_2_count: analysisData.product2Count,
          document_data: analysisData.documents as any,
          attachment_url: attachmentUrl,
          generated_pdf_url: pdfUrl,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        throw error;
      }

      setProtocol(protocolNumber);
      setCurrentStep("protocol");
      setShowConfirmDialog(false);
      
      toast({
        title: "Protocolo e PDF gerados",
        description: `Protocolo ${protocolNumber} criado com sucesso`,
      });
    } catch (error) {
      console.error("Error generating protocol:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar protocolo. Tente novamente.",
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
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className={mainContainerClass}>
        <Header userName={userName} userRole={userRole} />
        <main className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary">Fechamento de Receitas</h2>
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
                              <TableCell>{doc.pages <= 3 ? "Produto 1" : "Produto 2"}</TableCell>
                              <TableCell>{formatCurrency(doc.pages <= 3 ? 50 : doc.pages * 30)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Anexar Documento</CardTitle>
                    <CardDescription>
                      É obrigatório anexar um arquivo antes de confirmar o fechamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 hover:border-primary/50 transition-colors">
                      <FileUp className="h-10 w-10 text-muted-foreground mb-3" />
                      <label htmlFor="attachment-upload" className="cursor-pointer">
                        <span className="text-primary font-medium hover:underline">Clique para selecionar</span>
                        <span className="text-muted-foreground"> um arquivo</span>
                      </label>
                      <input
                        id="attachment-upload"
                        type="file"
                        onChange={handleAttachmentChange}
                        className="hidden"
                      />
                      {attachmentFile && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Arquivo selecionado: {attachmentFile.name}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-4">
                  <Button onClick={handleSubmitAgain} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Enviar Novamente
                  </Button>
                  <Button onClick={handleConfirm} className="gap-2" disabled={!attachmentFile}>
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
                        <li>Use o protocolo para referência na descrição</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
        )}

        {/* Histórico de Fechamentos */}
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <History className="h-4 w-4" />
              Histórico de Fechamentos
              <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Últimos Fechamentos</CardTitle>
                <CardDescription>
                  Histórico dos últimos 10 protocolos de fechamento gerados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {closingHistory.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocolo</TableHead>
                          <TableHead>Competência</TableHead>
                          <TableHead>Total IDs</TableHead>
                          <TableHead>Páginas</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {closingHistory.map((protocol) => (
                          <TableRow key={protocol.id}>
                            <TableCell className="font-mono font-medium">{protocol.protocol_number}</TableCell>
                            <TableCell>{format(new Date(protocol.competence_month), "MM/yyyy")}</TableCell>
                            <TableCell>{protocol.total_ids}</TableCell>
                            <TableCell>{protocol.total_pages}</TableCell>
                            <TableCell>{formatCurrency(protocol.total_value)}</TableCell>
                            <TableCell>
                              <ProtocolStatusBadge status={protocol.status || 'pending'} />
                            </TableCell>
                            <TableCell>{format(new Date(protocol.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum protocolo de fechamento encontrado
                  </p>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Fechamento</DialogTitle>
              <DialogDescription>
                Revise os dados antes de gerar o protocolo de fechamento. Este processo não pode ser revertido.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total de Documentos</p>
                  <p className="font-medium">{analysisData?.totalIds}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total de Páginas</p>
                  <p className="font-medium">{analysisData?.totalPages}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Total</p>
                  <p className="font-medium">{formatCurrency(analysisData?.totalValue || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Competência</p>
                  <p className="font-medium">{format(new Date(competenceMonth + "-01"), "MM/yyyy")}</p>
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
        </main>
      </div>
    </div>
  );
}