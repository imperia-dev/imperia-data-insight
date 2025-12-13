import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/validations/sanitized";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  type: z.enum(["improvement", "bug", "tip"], {
    required_error: "Selecione o tipo da sugestão",
  }),
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres").transform(sanitizeInput),
  description: z.string().min(20, "A descrição deve ter pelo menos 20 caracteres").transform(sanitizeInput),
});

type FormData = z.infer<typeof formSchema>;

interface SuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeLabels = {
  improvement: "Melhoria",
  bug: "Bug",
  tip: "Dica",
};

export function SuggestionsDialog({ open, onOpenChange }: SuggestionsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: undefined,
      title: "",
      description: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase
        .from("suggestions")
        .insert({
          user_id: user.id,
          type: data.type,
          title: data.title,
          description: data.description,
        });

      if (error) throw error;

      toast({
        title: "Sugestão enviada!",
        description: "Obrigado pela sua contribuição. Analisaremos em breve.",
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting suggestion:", error);
      toast({
        title: "Erro ao enviar sugestão",
        description: "Não foi possível enviar sua sugestão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>💡 Enviar Sugestão</DialogTitle>
          <DialogDescription>
            Compartilhe suas ideias de melhorias, reporte bugs ou envie dicas para aprimorar o sistema.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <SelectItem value="improvement">🚀 Melhoria</SelectItem>
                      <SelectItem value="bug">🐛 Bug</SelectItem>
                      <SelectItem value="tip">💡 Dica</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Resumo da sugestão" {...field} />
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
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva em detalhes sua sugestão, bug ou dica..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Sugestão
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
