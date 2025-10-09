import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Key, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface IdempotencyKey {
  id: string;
  key: string;
  operation_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  expires_at: string;
}

export function IdempotencyKeyMonitor() {
  const { data: keys, isLoading } = useQuery({
    queryKey: ["idempotency-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("idempotency_keys")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as IdempotencyKey[];
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Key className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Idempotency Keys</h3>
        <Badge variant="outline" className="ml-auto">
          Last 50 operations
        </Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operation Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys?.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.operation_type}</TableCell>
                <TableCell>{getStatusBadge(key.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(key.created_at), "PPp")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {key.completed_at ? format(new Date(key.completed_at), "PPp") : "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(key.expires_at), "PP")}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {key.key.substring(0, 16)}...
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {(!keys || keys.length === 0) && (
          <div className="p-8 text-center text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No idempotency keys found</p>
          </div>
        )}
      </Card>
    </div>
  );
}
