import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Mail, Phone, Building2, MessageSquare, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Fetch leads from database
  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ['leads', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Erro ao carregar leads",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

      return data || [];
    }
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('New lead received:', payload);
          refetch();
          toast({
            title: "Novo lead recebido!",
            description: `${payload.new.name} - ${payload.new.email}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, toast]);

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Lista atualizada",
      description: "Os leads foram recarregados com sucesso."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            Gerencie os leads recebidos via webhook
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Leads</CardTitle>
          <CardDescription>
            Todos os leads recebidos através da integração webhook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : leads && leads.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{lead.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.phone ? (
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{lead.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.company ? (
                          <div className="flex items-center space-x-1">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span>{lead.company}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {lead.source || 'webhook'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.message && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              toast({
                                title: "Mensagem do Lead",
                                description: lead.message
                              });
                            }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Nenhum lead encontrado. Os leads aparecerão aqui quando forem recebidos via webhook.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instruções para Integração</CardTitle>
          <CardDescription>
            Configure sua outra plataforma Lovable para enviar leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">1. URL do Webhook</h3>
            <code className="block p-3 bg-muted rounded-md text-sm">
              https://agttqqaampznczkyfvkf.supabase.co/functions/v1/webhook-leads
            </code>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">2. Header de Autenticação</h3>
            <p className="text-sm text-muted-foreground">
              Adicione o seguinte header em todas as requisições:
            </p>
            <code className="block p-3 bg-muted rounded-md text-sm">
              x-webhook-signature: [valor do WEBHOOK_SECRET]
            </code>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">3. Estrutura do Payload (JSON)</h3>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
{`{
  "lead": {
    "name": "Nome do Lead",
    "email": "email@exemplo.com",
    "phone": "11999999999",
    "company": "Empresa XYZ",
    "message": "Mensagem opcional",
    "source": "landing-page"
  },
  "metadata": {
    "campaign": "black-friday-2024",
    "utm_source": "google",
    "utm_medium": "cpc"
  }
}`}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">4. Exemplo de Edge Function (Plataforma Emissora)</h3>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
{`// Adicione esta função na sua outra plataforma
// supabase/functions/send-lead-webhook/index.ts

const WEBHOOK_URL = Deno.env.get('WEBHOOK_URL');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

const response = await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-signature': WEBHOOK_SECRET
  },
  body: JSON.stringify({
    lead: leadData,
    metadata: metadataInfo
  })
});`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}