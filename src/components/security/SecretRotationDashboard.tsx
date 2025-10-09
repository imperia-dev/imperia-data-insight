import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SecretSummary {
  secret_name: string;
  last_rotated: string;
  expires_at: string;
  days_until_expiration: number;
  rotation_count: number;
}

export function SecretRotationDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSecret, setSelectedSecret] = useState<string>("");
  const [rotationType, setRotationType] = useState<"manual" | "scheduled" | "compromised">("manual");

  const { data: secrets, isLoading } = useQuery({
    queryKey: ["secret-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_secrets_summary");
      if (error) throw error;
      return data as SecretSummary[];
    },
  });

  const rotateSecretMutation = useMutation({
    mutationFn: async (secretName: string) => {
      const { data, error } = await supabase.functions.invoke("rotate-secret", {
        body: {
          secret_name: secretName,
          rotation_type: rotationType,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Secret Rotated Successfully",
        description: (
          <div>
            <p className="mb-2">New secret has been generated.</p>
            <div className="bg-muted p-2 rounded font-mono text-xs break-all">
              {data.new_secret}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Copy this value and update it in your Supabase settings immediately. It will not be shown again.
            </p>
          </div>
        ),
        duration: 10000,
      });
      queryClient.invalidateQueries({ queryKey: ["secret-summary"] });
    },
    onError: (error: any) => {
      toast({
        title: "Rotation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getSeverityBadge = (daysUntilExpiration: number) => {
    if (daysUntilExpiration <= 0) {
      return <Badge variant="destructive">EXPIRED</Badge>;
    }
    if (daysUntilExpiration <= 7) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (daysUntilExpiration <= 30) {
      return <Badge className="bg-orange-500">Warning</Badge>;
    }
    return <Badge variant="secondary">OK</Badge>;
  };

  const getSeverityIcon = (daysUntilExpiration: number) => {
    if (daysUntilExpiration <= 7) {
      return <AlertTriangle className="h-5 w-5 text-destructive" />;
    }
    if (daysUntilExpiration <= 30) {
      return <Clock className="h-5 w-5 text-orange-500" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Secret Management
          </h2>
          <p className="text-muted-foreground">
            Monitor and rotate API keys and integration secrets
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {secrets?.map((secret) => (
          <Card key={secret.secret_name} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div>{getSeverityIcon(secret.days_until_expiration)}</div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{secret.secret_name}</h3>
                    {getSeverityBadge(secret.days_until_expiration)}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      Last rotated: {format(new Date(secret.last_rotated), "PPp")}
                    </p>
                    <p>
                      Expires: {format(new Date(secret.expires_at), "PPp")} 
                      <span className="ml-2">
                        ({secret.days_until_expiration} days remaining)
                      </span>
                    </p>
                    <p>Total rotations: {secret.rotation_count}</p>
                  </div>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant={secret.days_until_expiration <= 7 ? "destructive" : "outline"}
                    onClick={() => setSelectedSecret(secret.secret_name)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rotate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rotate Secret: {secret.secret_name}</DialogTitle>
                    <DialogDescription>
                      This will generate a new secret and expire the current one. Make sure to update
                      the value in your Supabase settings immediately after rotation.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Rotation Type</label>
                      <Select 
                        value={rotationType} 
                        onValueChange={(value: any) => setRotationType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual Rotation</SelectItem>
                          <SelectItem value="scheduled">Scheduled Rotation</SelectItem>
                          <SelectItem value="compromised">Compromised (Emergency)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {rotationType === "compromised" && (
                      <div className="bg-destructive/10 border border-destructive rounded p-3">
                        <p className="text-sm text-destructive font-medium">
                          ⚠️ This will create a critical security alert and notify all administrators.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <DialogTrigger asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogTrigger>
                    <Button
                      onClick={() => rotateSecretMutation.mutate(secret.secret_name)}
                      disabled={rotateSecretMutation.isPending}
                    >
                      {rotateSecretMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Confirm Rotation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        ))}
      </div>

      {(!secrets || secrets.length === 0) && (
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No secrets found</p>
        </Card>
      )}
    </div>
  );
}
