import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BackupCodeChallengeProps {
  onVerify: (code: string) => Promise<boolean>;
  onBack: () => void;
  loading?: boolean;
}

export function BackupCodeChallenge({ onVerify, onBack, loading }: BackupCodeChallengeProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!code || code.length < 8) {
      toast({
        title: "Código inválido",
        description: "Por favor, insira um código de backup válido.",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    const success = await onVerify(code.toUpperCase());
    
    if (!success) {
      setCode("");
      toast({
        title: "Código inválido",
        description: "Este código de backup não é válido ou já foi usado.",
        variant: "destructive",
      });
    }
    
    setVerifying(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length >= 8) {
      handleVerify();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Usar Código de Backup
        </CardTitle>
        <CardDescription>
          Insira um dos seus códigos de backup de 8 caracteres
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cada código de backup pode ser usado apenas uma vez. 
            Após o uso, ele será invalidado permanentemente.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <Label htmlFor="backup-code">Código de backup</Label>
          <Input
            id="backup-code"
            type="text"
            placeholder="XXXXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyPress={handleKeyPress}
            className="font-mono uppercase"
            maxLength={8}
            autoFocus
            disabled={verifying || loading}
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={onBack}
            disabled={verifying || loading}
          >
            Voltar
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleVerify}
            disabled={verifying || loading || code.length < 8}
          >
            {verifying || loading ? "Verificando..." : "Verificar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}