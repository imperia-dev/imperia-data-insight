import { useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeInput } from "@/lib/validations/sanitized";

interface ImportPendenciesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportRow {
  c4u_id: string;
  error_type: string;
  description: string;
  created_at?: string;
  status?: string;
}

// Map Portuguese error types to internal values
const errorTypeMapping: Record<string, string> = {
  "não é erro": "nao_e_erro",
  "falta de dados": "falta_de_dados",
  "apostila": "apostila",
  "erro em data": "erro_em_data",
  "nome separado": "nome_separado",
  "texto sem traduzir": "texto_sem_traduzir",
  "nome incorreto": "nome_incorreto",
  "texto duplicado": "texto_duplicado",
  "erro em crc": "erro_em_crc",
  "nome traduzido": "nome_traduzido",
  "falta parte do documento": "falta_parte_documento",
  "erro de digitação": "erro_digitacao",
  "sem assinatura do tradutor": "sem_assinatura_tradutor",
  "nome junto": "nome_junto",
  "tradução incompleta": "traducao_incompleta",
  "título incorreto": "titulo_incorreto",
  "trecho sem traduzir": "trecho_sem_traduzir",
  "matrícula incorreta": "matricula_incorreta",
  "espaçamento": "espacamento",
  "sem cabeçalho": "sem_cabecalho",
};

export function ImportPendenciesDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportPendenciesDialogProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);

  const normalizeErrorType = (value: string): string => {
    const normalized = value.toLowerCase().trim();
    return errorTypeMapping[normalized] || "";
  };

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;
    
    // Handle Excel serial date numbers
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      return date.toISOString();
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      // Try parsing DD/MM/YYYY format
      const ddmmyyyy = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyy) {
        const [_, day, month, year] = ddmmyyyy;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toISOString();
      }
      
      // Try ISO format
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    return null;
  };

  const normalizeStatus = (status: string): string => {
    if (!status) return 'pending';
    
    const normalizedStatus = status.toLowerCase().trim();
    
    const statusMap: Record<string, string> = {
      'pendente': 'pending',
      'resolvido': 'resolved',
      'em análise': 'analyzing',
      'em andamento': 'analyzing',
      'cancelado': 'cancelled'
    };
    
    return statusMap[normalizedStatus] || 'pending';
  };

  const validateRow = (row: any, index: number): ImportRow | null => {
    const c4u_id = row["ID C4U"] || row["ID c4u"] || row["c4u_id"] || row["C4U ID"] || "";
    const error_type_raw = row["Tipo de Erro"] || row["tipo de erro"] || row["error_type"] || row["tipo_erro"] || "";
    const description = row["Descrição"] || row["descrição"] || row["description"] || row["descricao"] || "";
    const created_at_raw = row["created_at"] || row["data"] || row["Data"] || "";
    const status_raw = row["status"] || row["Status"] || "";

    if (!c4u_id) {
      setErrors(prev => [...prev, `Linha ${index + 2}: ID C4U está vazio`]);
      return null;
    }

    const error_type = normalizeErrorType(error_type_raw);
    if (!error_type) {
      setErrors(prev => [...prev, `Linha ${index + 2}: Tipo de erro inválido: "${error_type_raw}"`]);
      return null;
    }

    if (!description) {
      setErrors(prev => [...prev, `Linha ${index + 2}: Descrição está vazia`]);
      return null;
    }

    const created_at = parseDate(created_at_raw);
    const status = normalizeStatus(status_raw);

    return {
      c4u_id: c4u_id.toString().trim(),
      error_type,
      description: description.toString().trim(),
      created_at: created_at || undefined,
      status
    };
  };

  const processFile = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      return new Promise<any[]>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error),
        });
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return new Promise<any[]>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });
    } else {
      throw new Error('Formato de arquivo não suportado. Use CSV ou XLSX.');
    }
  };

  const handleImport = async () => {
    if (!file || !user) return;

    setImporting(true);
    setErrors([]);
    setSuccessCount(0);
    setProgress(0);

    try {
      const data = await processFile(file);
      const validRows: any[] = [];
      
      // Validate all rows
      data.forEach((row, index) => {
        const validRow = validateRow(row, index);
        if (validRow) {
          const pendencyData: any = {
            c4u_id: sanitizeInput(validRow.c4u_id),
            error_type: validRow.error_type,
            description: sanitizeInput(validRow.description),
            created_by: user.id,
            status: validRow.status || 'pending',
            error_document_count: 0,
            order_id: null,
          };
          
          // Only add created_at if it's valid
          if (validRow.created_at) {
            pendencyData.created_at = validRow.created_at;
          }
          
          validRows.push(pendencyData);
        }
      });

      if (validRows.length === 0) {
        toast({
          title: "Erro na importação",
          description: "Nenhuma linha válida encontrada no arquivo.",
          variant: "destructive",
        });
        return;
      }

      // Insert in batches of 50
      const batchSize = 50;
      const totalBatches = Math.ceil(validRows.length / batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = validRows.slice(i * batchSize, (i + 1) * batchSize);
        
        const { error } = await supabase
          .from('pendencies')
          .insert(batch);

        if (error) {
          setErrors(prev => [...prev, `Erro ao inserir lote ${i + 1}: ${error.message}`]);
        } else {
          setSuccessCount(prev => prev + batch.length);
        }

        setProgress(((i + 1) / totalBatches) * 100);
      }

      toast({
        title: "Importação concluída",
        description: `${successCount + validRows.length} pendências importadas com sucesso.`,
      });

      onImportComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido ao processar arquivo.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo CSV ou XLSX.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setErrors([]);
      setSuccessCount(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Pendências</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou XLSX com as pendências. O arquivo deve conter as colunas:
            "ID C4U", "Tipo de Erro", "Descrição". Opcionalmente: "created_at" (data) e "status".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={importing}
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">
                {file ? file.name : "Clique para selecionar um arquivo"}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                CSV ou XLSX (máx. 10MB)
              </span>
            </label>
          </div>

          {file && !importing && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Arquivo selecionado: {file.name}
              </AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importando...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
              {successCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {successCount} pendências importadas
                </p>
              )}
            </div>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  <p className="font-medium">Erros encontrados:</p>
                  {errors.slice(0, 5).map((error, index) => (
                    <p key={index} className="text-xs">{error}</p>
                  ))}
                  {errors.length > 5 && (
                    <p className="text-xs italic">
                      ... e mais {errors.length - 5} erros
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}