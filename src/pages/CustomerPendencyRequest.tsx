import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerContext } from "@/hooks/useCustomerContext";
import { customerPendencyRequestSchema, type CustomerPendencyRequestInput } from "@/lib/validations/customerPendency";
import { Upload, X, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CustomerPendencyRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, user } = useAuth();
  const { customerName, loading: customerLoading } = useCustomerContext();
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ url: string; name: string; size: number; type: string }>>([]);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("customer");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
          setUserRole(data.role);
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const form = useForm<CustomerPendencyRequestInput>({
    resolver: zodResolver(customerPendencyRequestSchema),
    defaultValues: {
      order_id: "",
      description: "",
      priority: "normal",
      attachments: []
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newFiles = [];

      for (const file of Array.from(files)) {
        // Validação de tamanho (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: `${file.name} excede o tamanho máximo de 10MB`,
            variant: "destructive"
          });
          continue;
        }

        // Validação de tipo
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: "Tipo de arquivo não permitido",
            description: `${file.name} não é um tipo permitido (PDF, PNG, JPG, DOC, DOCX)`,
            variant: "destructive"
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${session?.user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('customer-pendency-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('customer-pendency-attachments')
          .getPublicUrl(filePath);

        newFiles.push({
          url: publicUrl,
          name: file.name,
          size: file.size,
          type: file.type
        });
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "Arquivos enviados",
        description: `${newFiles.length} arquivo(s) adicionado(s) com sucesso`
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Erro ao enviar arquivos",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: CustomerPendencyRequestInput) => {
    if (!customerName) {
      toast({
        title: "Erro",
        description: "Nome do cliente não encontrado",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_pendency_requests')
        .insert({
          order_id: data.order_id,
          customer_name: customerName,
          description: data.description,
          priority: data.priority,
          attachments: uploadedFiles,
          created_by: session?.user?.id
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação foi enviada com sucesso e está sendo analisada"
      });

      navigate('/customer-requests');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  if (customerLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        <main className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Nova Solicitação de Pendência</CardTitle>
          <CardDescription>
            Preencha o formulário abaixo para solicitar a correção de uma pendência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="order_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Pedido *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: C4U12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Erro *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva detalhadamente o erro encontrado (mínimo 20 caracteres)"
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Anexos (Opcional)</FormLabel>
                <Alert>
                  <AlertDescription className="text-sm">
                    Tipos permitidos: PDF, PNG, JPG, DOC, DOCX • Tamanho máximo: 10MB por arquivo
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Enviando..." : "Adicionar Arquivos"}
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={uploading}>
                  Enviar Solicitação
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/customer-requests')}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      </main>
      </div>
    </div>
  );
}
