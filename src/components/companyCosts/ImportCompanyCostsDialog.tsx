import * as React from "react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, AlertCircle, CheckCircle, XCircle, FileSpreadsheet, Edit2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parse as parseCSV } from "papaparse";
import * as XLSX from "xlsx";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ImportCompanyCostsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportRow {
  date: string;
  category: string;
  sub_category?: string;
  description: string;
  observations?: string;
  amount: number;
  isValid: boolean;
  errors: string[];
  originalRow?: number;
}

const categories = [
  "Airbnb",
  "Passagem Aérea",
  "Refeição",
  "Software",
  "Custo",
  "Marketing",
  "Infraestrutura",
  "Consultoria",
  "Outros"
];

const subCategories: Record<string, string[]> = {
  Software: ["Novas Ideias", "Gestão", "Comunicação", "Desenvolvimento"],
  Custo: ["Utensílios", "Material de Escritório", "Manutenção"],
  Marketing: ["Publicidade", "Eventos", "Material Promocional"],
  Infraestrutura: ["Internet", "Telefone", "Aluguel", "Energia"],
};

export function ImportCompanyCostsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportCompanyCostsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<ImportRow | null>(null);

  const parseDate = (value: any): string | null => {
    if (!value) return null;

    // Try to parse as Excel serial date
    if (typeof value === "number") {
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
      if (isValid(date)) {
        return format(date, "yyyy-MM-dd");
      }
    }

    // Try various date formats
    const dateFormats = [
      "dd/MM/yyyy",
      "dd-MM-yyyy",
      "yyyy-MM-dd",
      "MM/dd/yyyy",
      "dd/MM/yy",
    ];

    for (const fmt of dateFormats) {
      try {
        const parsed = parse(String(value), fmt, new Date());
        if (isValid(parsed)) {
          return format(parsed, "yyyy-MM-dd");
        }
      } catch {
        continue;
      }
    }

    return null;
  };

  const parseAmount = (value: any): number | null => {
    if (!value) return null;
    
    // Convert to string and clean
    let cleanValue = String(value)
      .replace(/[R$\s]/g, "") // Remove R$, spaces
      .replace(/\./g, "") // Remove thousand separators
      .replace(",", "."); // Replace Brazilian decimal separator

    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? null : parsed;
  };

  const validateRow = (row: any, rowIndex: number): ImportRow => {
    const errors: string[] = [];
    
    // Parse date
    const date = parseDate(row.Data || row.data || row.DATE || row.Date);
    if (!date) {
      errors.push("Data inválida ou ausente");
    }

    // Parse category
    const rawCategory = row.Categoria || row.categoria || row.CATEGORY || row.Category || "";
    const category = categories.find(
      cat => cat.toLowerCase() === rawCategory.toLowerCase()
    ) || rawCategory;
    
    if (!category) {
      errors.push("Categoria é obrigatória");
    } else if (!categories.includes(category)) {
      errors.push(`Categoria "${category}" não é válida`);
    }

    // Parse subcategory
    const rawSubCategory = row["Sub Categoria"] || row["Subcategoria"] || row.sub_category || row.SUBCATEGORY || "";
    const sub_category = rawSubCategory || undefined;
    
    // Validate subcategory if provided and category has subcategories
    if (sub_category && category && subCategories[category]) {
      if (!subCategories[category].includes(sub_category)) {
        errors.push(`Subcategoria "${sub_category}" não é válida para a categoria "${category}"`);
      }
    }

    // Parse description
    const description = row.Descrição || row.Descricao || row.descricao || row.DESCRIPTION || row.Description || "";
    if (!description) {
      errors.push("Descrição é obrigatória");
    }

    // Parse observations
    const observations = row.Observações || row.Observacoes || row.observacoes || row.OBSERVATIONS || row.Observations || "";

    // Parse amount
    const amount = parseAmount(row.Valor || row.valor || row.VALUE || row.Amount || row.AMOUNT);
    if (!amount || amount <= 0) {
      errors.push("Valor deve ser um número positivo");
    }

    return {
      date: date || "",
      category,
      sub_category,
      description,
      observations,
      amount: amount || 0,
      isValid: errors.length === 0,
      errors,
      originalRow: rowIndex + 1,
    };
  };

  const processFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (fileExtension === "csv") {
        parseCSV(file, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            resolve(result.data);
          },
          error: (error) => {
            reject(error);
          },
        });
      } else if (["xlsx", "xls"].includes(fileExtension || "")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: "binary" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      } else {
        reject(new Error("Formato de arquivo não suportado"));
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setShowPreview(false);
      setParsedData([]);
      setErrors([]);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      toast.error("Por favor, selecione um arquivo");
      return;
    }

    try {
      const data = await processFile(file);
      if (data.length === 0) {
        toast.error("O arquivo está vazio");
        return;
      }

      const validatedData = data.map((row, index) => validateRow(row, index));
      const invalidRows = validatedData.filter(row => !row.isValid);
      
      setParsedData(validatedData);
      setShowPreview(true);

      if (invalidRows.length > 0) {
        toast.warning(`${invalidRows.length} linha(s) com erro(s) encontrada(s)`);
      } else {
        toast.success(`${validatedData.length} linha(s) prontas para importação`);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Erro ao processar arquivo");
    }
  };

  const handleEditRow = (index: number) => {
    setEditingRow(index);
    setEditedData({ ...parsedData[index] });
  };

  const handleSaveEdit = () => {
    if (editingRow !== null && editedData) {
      // Revalidate the edited data
      const errors: string[] = [];
      
      if (!editedData.date) {
        errors.push("Data é obrigatória");
      }
      
      if (!editedData.category || !categories.includes(editedData.category)) {
        errors.push("Categoria inválida");
      }
      
      if (editedData.sub_category && editedData.category && subCategories[editedData.category]) {
        if (!subCategories[editedData.category].includes(editedData.sub_category)) {
          errors.push("Subcategoria inválida para a categoria selecionada");
        }
      }
      
      if (!editedData.description) {
        errors.push("Descrição é obrigatória");
      }
      
      if (!editedData.amount || editedData.amount <= 0) {
        errors.push("Valor deve ser positivo");
      }

      const updatedRow = {
        ...editedData,
        isValid: errors.length === 0,
        errors,
      };

      const updatedData = [...parsedData];
      updatedData[editingRow] = updatedRow;
      setParsedData(updatedData);
      setEditingRow(null);
      setEditedData(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditedData(null);
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(row => row.isValid);
    
    if (validRows.length === 0) {
      toast.error("Nenhuma linha válida para importar");
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      const batchSize = 10;
      const totalBatches = Math.ceil(validRows.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = validRows.slice(i * batchSize, (i + 1) * batchSize);
        
        const { error } = await supabase
          .from("company_costs")
          .insert(
            batch.map(row => ({
              date: row.date,
              category: row.category,
              sub_category: row.sub_category || null,
              description: row.description,
              observations: row.observations || null,
              amount: row.amount,
            }))
          );

        if (error) throw error;

        setProgress(((i + 1) / totalBatches) * 100);
      }

      toast.success(`${validRows.length} custos importados com sucesso!`);
      onImportComplete();
      handleClose();
    } catch (error) {
      console.error("Error importing costs:", error);
      toast.error("Erro ao importar custos");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setShowPreview(false);
    setErrors([]);
    setProgress(0);
    setEditingRow(null);
    setEditedData(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Custos via CSV/Excel
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {!showPreview ? (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload">Selecione o arquivo (CSV, XLSX ou XLS)</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {file && (
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {file.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Formato esperado do arquivo:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li><strong>Data</strong>: DD/MM/YYYY ou YYYY-MM-DD</li>
                        <li><strong>Categoria</strong>: {categories.join(", ")}</li>
                        <li><strong>Sub Categoria</strong> (opcional): De acordo com a categoria</li>
                        <li><strong>Descrição</strong>: Texto descritivo do custo</li>
                        <li><strong>Observações</strong> (opcional): Informações adicionais</li>
                        <li><strong>Valor</strong>: Número (ex: 1234.56 ou R$ 1.234,56)</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={handlePreview} disabled={!file}>
                  <Upload className="h-4 w-4 mr-2" />
                  Visualizar Dados
                </Button>
              </div>
            </>
          ) : (
            <>
              {importing && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Importando dados...</p>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Preview dos Dados</h3>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {parsedData.filter(r => r.isValid).length} válidas
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      {parsedData.filter(r => !r.isValid).length} com erros
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="h-[400px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky top-0 bg-background">Linha</TableHead>
                        <TableHead className="sticky top-0 bg-background">Status</TableHead>
                        <TableHead className="sticky top-0 bg-background">Data</TableHead>
                        <TableHead className="sticky top-0 bg-background">Categoria</TableHead>
                        <TableHead className="sticky top-0 bg-background">Subcategoria</TableHead>
                        <TableHead className="sticky top-0 bg-background">Descrição</TableHead>
                        <TableHead className="sticky top-0 bg-background">Observações</TableHead>
                        <TableHead className="sticky top-0 bg-background text-right">Valor</TableHead>
                        <TableHead className="sticky top-0 bg-background">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.map((row, index) => (
                        <TableRow key={index} className={row.isValid ? "" : "bg-red-50 dark:bg-red-950/20"}>
                          <TableCell>{row.originalRow}</TableCell>
                          <TableCell>
                            {row.isValid ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="flex items-center gap-1">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <div className="hidden group-hover:block absolute z-10 bg-popover p-2 rounded-md shadow-md text-xs max-w-xs">
                                  {row.errors.join(", ")}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRow === index ? (
                              <Input
                                type="date"
                                value={editedData?.date || ""}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, date: e.target.value} : null)}
                                className="w-32"
                              />
                            ) : (
                              row.date ? format(new Date(row.date + "T00:00:00"), "dd/MM/yyyy") : "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRow === index ? (
                              <Select
                                value={editedData?.category || ""}
                                onValueChange={(value) => setEditedData(prev => prev ? {...prev, category: value} : null)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              row.category || "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRow === index && editedData?.category && subCategories[editedData.category] ? (
                              <Select
                                value={editedData?.sub_category || ""}
                                onValueChange={(value) => setEditedData(prev => prev ? {...prev, sub_category: value} : null)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                  {subCategories[editedData.category].map(subCat => (
                                    <SelectItem key={subCat} value={subCat}>{subCat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              row.sub_category || "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRow === index ? (
                              <Input
                                value={editedData?.description || ""}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, description: e.target.value} : null)}
                                className="w-48"
                              />
                            ) : (
                              <span className="max-w-xs truncate" title={row.description}>
                                {row.description || "-"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRow === index ? (
                              <Textarea
                                value={editedData?.observations || ""}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, observations: e.target.value} : null)}
                                className="w-48 h-20"
                              />
                            ) : (
                              <span className="max-w-xs truncate" title={row.observations}>
                                {row.observations || "-"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingRow === index ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={editedData?.amount || ""}
                                onChange={(e) => setEditedData(prev => prev ? {...prev, amount: parseFloat(e.target.value)} : null)}
                                className="w-24"
                              />
                            ) : (
                              new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(row.amount)
                            )}
                          </TableCell>
                          <TableCell>
                            {editingRow === index ? (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditRow(index)}
                                disabled={importing}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {parsedData.some(r => !r.isValid) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-semibold">Erros encontrados:</p>
                        {Array.from(new Set(parsedData.flatMap(r => r.errors))).map((error, i) => (
                          <p key={i} className="text-sm">• {error}</p>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={importing}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || parsedData.filter(r => r.isValid).length === 0}
                >
                  {importing ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar {parsedData.filter(r => r.isValid).length} Custos
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}