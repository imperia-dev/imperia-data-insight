import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReviewerProtocolStatusBadge } from "../reviewerProtocols/ReviewerProtocolStatusBadge";
import { ReviewerProtocolDetailsDialog } from "../reviewerProtocols/ReviewerProtocolDetailsDialog";
import { ProtocolMetrics } from "./ProtocolMetrics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface RevisaoProtocolsTabProps {
  userRole: string;
}

export function RevisaoProtocolsTab({ userRole }: RevisaoProtocolsTabProps) {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    totalProtocols: 0,
    totalAmount: 0,
    pendingCount: 0,
    averageValue: 0
  });

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    setLoading(true);
    try {
      const { data: protocolsData, error: protocolsError } = await supabase
        .from('reviewer_protocols')
        .select('*')
        .not('status', 'in', '("cancelled","draft")')
        .order('created_at', { ascending: false });

      if (protocolsError) throw protocolsError;

      // Use the reviewer_name directly from the table
      const protocolsWithReviewers = (protocolsData || []).map(p => ({
        ...p,
        reviewer: p.reviewer_name ? { full_name: p.reviewer_name } : null
      }));

      setProtocols(protocolsWithReviewers);

      const totalAmount = protocolsData
        .filter(p => p.paid_at)
        .reduce((sum, p) => sum + (p.total_amount || 0), 0);
      
      const pendingCount = protocolsData.filter(p => !p.paid_at && p.status !== 'cancelled').length;
      const averageDocuments = protocolsData.length > 0 
        ? protocolsData.reduce((sum, p) => sum + (p.document_count || 0), 0) / protocolsData.length 
        : 0;

      setMetrics({
        totalProtocols: protocolsData.length,
        totalAmount,
        pendingCount,
        averageValue: averageDocuments
      });
    } catch (error: any) {
      console.error('Error fetching protocols:', error);
      toast.error("Erro ao carregar protocolos");
    } finally {
      setLoading(false);
    }
  };

  const handleProtocolClick = (protocol: any) => {
    setSelectedProtocol(protocol);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProtocolMetrics {...metrics} />

      <Card>
        <CardHeader>
          <CardTitle>Protocolos de Revisão</CardTitle>
        </CardHeader>
        <CardContent>
          {protocols.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum protocolo encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Revisor</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocols.map((protocol) => (
                  <TableRow 
                    key={protocol.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleProtocolClick(protocol)}
                  >
                    <TableCell className="font-mono text-sm">{protocol.protocol_number}</TableCell>
                    <TableCell>{protocol.reviewer?.full_name || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(protocol.competence_month + "T12:00:00"), "MMM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>{protocol.order_count || 0}</TableCell>
                    <TableCell>{protocol.document_count || 0}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(protocol.total_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <ReviewerProtocolStatusBadge status={protocol.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ReviewerProtocolDetailsDialog
        protocol={selectedProtocol}
        open={!!selectedProtocol}
        onOpenChange={(open) => !open && setSelectedProtocol(null)}
      />
    </div>
  );
}
