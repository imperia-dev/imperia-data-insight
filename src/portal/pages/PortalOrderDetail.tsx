import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Order = {
  id: string;
  order_number: string;
  language_pair: string;
  translation_type: string;
  status: string;
  total_documents: number;
  total_pages: number;
  total_characters: number;
  notes: string | null;
  submitted_at: string | null;
  created_at: string;
};
type FileRow = { id: string; original_filename: string; pages: number; characters: number; analysis_status: string };

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviado",
  processing: "Em processamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function OrderDetailInner() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: o }, { data: f }] = await Promise.all([
        supabase.from("trial_orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("trial_order_files").select("id,original_filename,pages,characters,analysis_status").eq("order_id", id).order("created_at"),
      ]);
      setOrder(o as Order | null);
      setFiles((f as FileRow[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/portal/app/pedidos"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link></Button>
        {loading || !order ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold">{order.order_number}</h1>
                <p className="text-muted-foreground">Criado em {new Date(order.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <Badge>{statusLabels[order.status] ?? order.status}</Badge>
            </div>
            <Card>
              <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                <div><span className="text-muted-foreground">Idioma: </span>{order.language_pair === "pt-it" ? "PT → IT" : "IT → PT"}</div>
                <div><span className="text-muted-foreground">Tipo: </span>Juramentada</div>
                <div><span className="text-muted-foreground">Documentos: </span>{order.total_documents}</div>
                <div><span className="text-muted-foreground">Páginas: </span>{order.total_pages}</div>
                <div className="sm:col-span-2"><span className="text-muted-foreground">Caracteres: </span>{order.total_characters.toLocaleString("pt-BR")}</div>
                {order.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">Observações: </span>{order.notes}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Arquivos</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 border rounded-md p-3 text-sm">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{f.original_filename}</div>
                      <div className="text-xs text-muted-foreground">{f.pages} págs · {f.characters.toLocaleString("pt-BR")} caracteres</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
    </div>
  );
}

export default function PortalOrderDetail() {
  return <OrderDetailInner />;
}
