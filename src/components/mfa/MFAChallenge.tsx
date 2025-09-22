import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MFAChallengeProps {
  onVerify: (code: string) => Promise<boolean>;
  onUseBackupCode?: () => void;
  loading?: boolean;
}

export function MFAChallenge({ onVerify, onUseBackupCode, loading }: MFAChallengeProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      toast({
        title: "Código inválido",
        description: "Por favor, insira um código de 6 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    const success = await onVerify(code);
    
    if (!success) {
      setAttempts(attempts + 1);
      setCode("");
      
      if (attempts >= 2) {
        toast({
          title: "Muitas tentativas falhadas",
          description: "Considere usar um código de backup se você perdeu acesso ao seu autenticador.",
          variant: "destructive",
        });
      }
    }
    
    setVerifying(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Verificação em Duas Etapas
        </CardTitle>
        <CardDescription>
          Insira o código de 6 dígitos do seu aplicativo autenticador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attempts > 2 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              Tendo problemas? Você pode usar um código de backup se perdeu acesso ao seu autenticador.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="mfa-code">Código de verificação</Label>
          <Input
            id="mfa-code"
            type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyPress={handleKeyPress}
            className="text-center text-2xl font-mono"
            maxLength={6}
            autoFocus
            disabled={verifying || loading}
          />
        </div>
        
        <Button 
          className="w-full" 
          onClick={handleVerify}
          disabled={verifying || loading || code.length !== 6}
        >
          {verifying || loading ? "Verificando..." : "Verificar"}
        </Button>
        
        {onUseBackupCode && (
          <Button 
            variant="link" 
            className="w-full text-sm"
            onClick={onUseBackupCode}
            disabled={verifying || loading}
          >
            Usar código de backup
          </Button>
        )}
      </CardContent>
    </Card>
  );
}