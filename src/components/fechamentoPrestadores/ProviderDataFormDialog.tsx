import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload } from "lucide-react";
import { sanitizeInput } from "@/lib/validations/sanitized";

interface ProviderDataFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolId: string;
  onSuccess: () => void;
}

export function ProviderDataFormDialog({
  open,
  onOpenChange,
  protocolId,
  onSuccess,
}: ProviderDataFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    cpf: "",
    cnpj: "",
    pix_key: "",
    banco: "",
    agencia: "",
    conta: "",
    tipo_conta: "corrente",
    invoice_amount: "",
  });

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setInvoiceFile(e.target.files[0]);
    }
  };

  const uploadInvoice = async (): Promise<string | null> => {
    if (!invoiceFile) return null;

    setUploading(true);
    try {
      const fileExt = invoiceFile.name.split(".").pop();
      const fileName = `${protocolId}-${Date.now()}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("service-provider-files")
        .upload(filePath, invoiceFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("service-provider-files")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.invoice_amount || !invoiceFile) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o valor da nota fiscal e anexe o arquivo",
        variant: "destructive",
      });
      return;
    }

    if (!formData.cpf && !formData.cnpj) {
      toast({
        title: "Documento obrigatório",
        description: "Informe CPF ou CNPJ",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const invoiceUrl = await uploadInvoice();
      if (!invoiceUrl) {
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("service_provider_protocols")
        .update({
          provider_cpf: formData.cpf ? sanitizeInput(formData.cpf) : null,
          provider_cnpj: formData.cnpj ? sanitizeInput(formData.cnpj) : null,
          provider_pix_key: formData.pix_key ? sanitizeInput(formData.pix_key) : null,
          provider_banco: formData.banco ? sanitizeInput(formData.banco) : null,
          provider_agencia: formData.agencia ? sanitizeInput(formData.agencia) : null,
          provider_conta: formData.conta ? sanitizeInput(formData.conta) : null,
          provider_tipo_conta: formData.tipo_conta,
          invoice_amount: parseFloat(formData.invoice_amount),
          invoice_file_url: invoiceUrl,
          status: "awaiting_master_final",
        })
        .eq("id", protocolId);

      if (error) throw error;

      toast({
        title: "Dados enviados",
        description: "Seus dados foram enviados para validação do master",
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        cpf: "",
        cnpj: "",
        pix_key: "",
        banco: "",
        agencia: "",
        conta: "",
        tipo_conta: "corrente",
        invoice_amount: "",
      });
      setInvoiceFile(null);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inserir Dados de Pagamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="pix_key">Chave PIX</Label>
              <Input
                id="pix_key"
                value={formData.pix_key}
                onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                placeholder="Email, telefone, CPF/CNPJ ou chave aleatória"
              />
            </div>

            <div>
              <Label htmlFor="banco">Banco</Label>
              <Input
                id="banco"
                value={formData.banco}
                onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                placeholder="Nome do banco"
              />
            </div>

            <div>
              <Label htmlFor="agencia">Agência</Label>
              <Input
                id="agencia"
                value={formData.agencia}
                onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                placeholder="0000"
              />
            </div>

            <div>
              <Label htmlFor="conta">Conta</Label>
              <Input
                id="conta"
                value={formData.conta}
                onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                placeholder="00000-0"
              />
            </div>

            <div>
              <Label htmlFor="tipo_conta">Tipo de Conta</Label>
              <select
                id="tipo_conta"
                value={formData.tipo_conta}
                onChange={(e) => setFormData({ ...formData, tipo_conta: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
              </select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="invoice_amount">Valor da Nota Fiscal *</Label>
              <Input
                id="invoice_amount"
                type="number"
                step="0.01"
                value={formData.invoice_amount}
                onChange={(e) => setFormData({ ...formData, invoice_amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="invoice_file">Nota Fiscal *</Label>
              <div className="flex gap-2">
                <Input
                  id="invoice_file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {invoiceFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  {invoiceFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar para Aprovação
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
