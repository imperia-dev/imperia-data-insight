import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Announcement } from "@/pages/Announcements";

const formSchema = z.object({
  title: z.string().min(3, "O título deve ter no mínimo 3 caracteres"),
  content: z.string().min(10, "O conteúdo deve ter no mínimo 10 caracteres"),
  type: z.enum(["info", "warning", "success", "error"]),
  priority: z.number().min(1).max(10),
  is_active: z.boolean(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  image_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
}

export const AnnouncementDialog = ({
  open,
  onOpenChange,
  announcement,
}: AnnouncementDialogProps) => {
  const { toast } = useToast();
  const isEditing = !!announcement;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "info",
      priority: 1,
      is_active: true,
      start_date: undefined,
      end_date: undefined,
      image_url: "",
    },
  });

  useEffect(() => {
    if (announcement) {
      form.reset({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type as "info" | "warning" | "success" | "error",
        priority: announcement.priority,
        is_active: announcement.is_active,
        start_date: announcement.start_date ? new Date(announcement.start_date) : undefined,
        end_date: announcement.end_date ? new Date(announcement.end_date) : undefined,
        image_url: announcement.image_url || "",
      });
    } else {
      form.reset({
        title: "",
        content: "",
        type: "info",
        priority: 1,
        is_active: true,
        start_date: undefined,
        end_date: undefined,
        image_url: "",
      });
    }
  }, [announcement, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const data = {
        title: values.title,
        content: values.content,
        type: values.type,
        priority: values.priority,
        is_active: values.is_active,
        start_date: values.start_date?.toISOString() || null,
        end_date: values.end_date?.toISOString() || null,
        image_url: values.image_url || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("announcements")
          .update(data)
          .eq("id", announcement.id);

        if (error) throw error;

        toast({
          title: "Aviso atualizado",
          description: "O aviso foi atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("announcements")
          .insert([data]);

        if (error) throw error;

        toast({
          title: "Aviso criado",
          description: "O aviso foi criado com sucesso.",
        });
      }

      onOpenChange(true); // Pass true to trigger refetch
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o aviso.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Aviso" : "Novo Aviso"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Edite as informações do aviso abaixo."
              : "Preencha os dados para criar um novo aviso."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título do aviso" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite o conteúdo do aviso"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="info">Informativo</SelectItem>
                        <SelectItem value="warning">Atenção</SelectItem>
                        <SelectItem value="success">Sucesso</SelectItem>
                        <SelectItem value="error">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade (1-10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Menor número = maior prioridade
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início (opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Fim (opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Aviso Ativo</FormLabel>
                    <FormDescription>
                      Avisos inativos não serão exibidos para os usuários
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? "Salvar Alterações" : "Criar Aviso"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
