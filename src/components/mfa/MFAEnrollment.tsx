import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Download, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMFA } from "@/hooks/useMFA";

interface MFAEnrollmentProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function MFAEnrollment({ onComplete, onCancel }: MFAEnrollmentProps) {
  const { enrollTOTP, verifyTOTP, generateBackupCodes } = useMFA();
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<"setup" | "verify" | "backup">("setup");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    startEnrollment();
  }, []);

  const startEnrollment = async () => {
    setLoading(true);
    const data = await enrollTOTP();
    
    if (data) {
      setFactorId(data.id);
      setSecret(data.totp.secret);
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(data.totp.uri);
      setQrCode(qrDataUrl);
    } else {
      onCancel();
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Código inválido",
        description: "Por favor, insira um código de 6 dígitos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const success = await verifyTOTP(factorId, verificationCode);
    
    if (success) {
      // Generate backup codes
      const codes = await generateBackupCodes();
      if (codes && codes.length > 0) {
        setBackupCodes(codes);
        setStep("backup");
      } else {
        // If no backup codes, complete enrollment
        onComplete();
      }
    }
    setLoading(false);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast({
      title: "Chave copiada",
      description: "A chave secreta foi copiada para a área de transferência.",
    });
  };

  const downloadBackupCodes = () => {
    const content = `Códigos de Backup - Imperia Traduções
====================================

IMPORTANTE: Guarde estes códigos em um local seguro!
Cada código pode ser usado apenas uma vez.

${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Data de geração: ${new Date().toLocaleString('pt-BR')}
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imperia-backup-codes.txt';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Códigos baixados",
      description: "Os códigos de backup foram salvos em seu dispositivo.",
    });
  };

  const copyBackupCodes = () => {
    const codes = backupCodes.join('\n');
    navigator.clipboard.writeText(codes);
    toast({
      title: "Códigos copiados",
      description: "Os códigos de backup foram copiados para a área de transferência.",
    });
  };

  if (step === "setup") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurar Autenticação de Dois Fatores
          </CardTitle>
          <CardDescription>
            Use um aplicativo autenticador TOTP para adicionar segurança extra à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>⚠️ ATENÇÃO: Use apenas aplicativos autenticadores TOTP!</strong>
              <div className="mt-2 space-y-2">
                <p className="font-semibold text-green-700">✅ Aplicativos CORRETOS:</p>
                <ul className="ml-4 list-disc text-sm">
                  <li>Google Authenticator</li>
                  <li>Microsoft Authenticator</li>
                  <li>Authy</li>
                  <li>FreeOTP</li>
                  <li>Aegis (Android)</li>
                </ul>
                <p className="font-semibold text-red-700 mt-2">❌ NÃO use:</p>
                <ul className="ml-4 list-disc text-sm">
                  <li>Gerenciadores de senha (1Password, LastPass, etc)</li>
                  <li>Aplicativos de notas</li>
                  <li>Câmera do celular diretamente</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">📱 Como configurar:</h4>
              <ol className="space-y-2 text-sm text-blue-800">
                <li>1. Abra o <strong>Google Authenticator</strong> ou outro app TOTP</li>
                <li>2. Toque no botão <strong>"+"</strong> ou <strong>"Adicionar conta"</strong></li>
                <li>3. Escolha <strong>"Escanear código QR"</strong></li>
                <li>4. Aponte a câmera para o código abaixo:</li>
              </ol>
            </div>
            
            <div className="text-center">
              {qrCode && (
                <div className="inline-block p-4 bg-white border-2 border-gray-300 rounded-lg">
                  <img 
                    src={qrCode} 
                    alt="QR Code para 2FA" 
                    className="mx-auto"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Não consegue escanear? Use a entrada manual:</Label>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="text-sm">
                  <strong>Nome da conta:</strong> Imperia Traduções
                </div>
                <div className="text-sm">
                  <strong>Chave secreta:</strong>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={secret} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={copySecret}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Digite esta chave no campo "Chave" ou "Secret" do seu app autenticador
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => setStep("verify")}
              disabled={loading}
            >
              Próximo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "verify") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verificar Configuração</CardTitle>
          <CardDescription>
            Insira o código de 6 dígitos do seu aplicativo autenticador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código de verificação</Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl font-mono"
              maxLength={6}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setStep("setup")}
              disabled={loading}
            >
              Voltar
            </Button>
            <Button 
              onClick={handleVerify}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? "Verificando..." : "Verificar e Ativar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          2FA Ativado com Sucesso!
        </CardTitle>
        <CardDescription>
          Salve seus códigos de backup em um local seguro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>IMPORTANTE:</strong> Guarde estes códigos em um local seguro. 
            Você precisará deles se perder acesso ao seu aplicativo autenticador.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <Label>Seus códigos de backup</Label>
          <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
            {backupCodes.map((code, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-muted-foreground">{index + 1}.</span>
                <span className="font-semibold">{code}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={copyBackupCodes}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Códigos
          </Button>
          <Button 
            variant="outline" 
            onClick={downloadBackupCodes}
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Códigos
          </Button>
        </div>
        
        <Button 
          className="w-full" 
          onClick={onComplete}
        >
          Concluir Configuração
        </Button>
      </CardContent>
    </Card>
  );
}