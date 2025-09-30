import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, User, Bell, AlertCircle, CheckCircle, Key, Download, Copy, Palette, Facebook } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMFA } from "@/hooks/useMFA";
import { MFAEnrollment } from "@/components/mfa/MFAEnrollment";
import { useToast } from "@/hooks/use-toast";
import { AvatarSettings } from "@/components/settings/AvatarSettings";
import { FacebookIntegration } from "@/components/settings/FacebookIntegration";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [showMFAEnrollment, setShowMFAEnrollment] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const { 
    mfaEnabled, 
    factors, 
    loading: mfaLoading, 
    disableMFA, 
    generateBackupCodes,
    checkMFAStatus,
    cleanupUnverifiedFactors 
  } = useMFA();

  const fetchUserProfile = async () => {
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, avatar_url, avatar_style, avatar_color, avatar_animation_preference')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setUserName(data.full_name);
        setUserRole(data.role);
        setUserProfile(data);
      }
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const handleToggleMFA = async () => {
    if (mfaEnabled) {
      // Confirm before disabling
      const confirmed = window.confirm(
        "Tem certeza que deseja desativar a autenticação de dois fatores? Isso tornará sua conta menos segura."
      );
      
      if (confirmed) {
        const success = await disableMFA();
        if (success) {
          await checkMFAStatus();
        }
      }
    } else {
      // Clean up any unverified factors before showing enrollment
      await cleanupUnverifiedFactors();
      setShowMFAEnrollment(true);
    }
  };

  const handleMFAEnrollmentComplete = async () => {
    setShowMFAEnrollment(false);
    await checkMFAStatus();
    toast({
      title: "2FA Configurado",
      description: "Autenticação de dois fatores foi ativada com sucesso.",
    });
  };

  const handleGenerateBackupCodes = async () => {
    const codes = await generateBackupCodes();
    if (codes) {
      setBackupCodes(codes);
      setShowBackupCodes(true);
    }
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
      description: "Os códigos de backup foram copiados.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-foreground">Configurações</h1>
          
          <Tabs defaultValue="profile" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-2" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="avatar">
                <Palette className="h-4 w-4 mr-2" />
                Avatar
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Segurança
              </TabsTrigger>
              <TabsTrigger value="integrations">
                <Facebook className="h-4 w-4 mr-2" />
                Integrações
              </TabsTrigger>
              <TabsTrigger value="preferences">
                <Bell className="h-4 w-4 mr-2" />
                Preferências
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Perfil</CardTitle>
                  <CardDescription>
                    Gerencie suas informações pessoais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <p className="text-sm text-muted-foreground">{userName}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Função</Label>
                    <p className="text-sm text-muted-foreground capitalize">{userRole}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="avatar">
              {userProfile && (
                <AvatarSettings 
                  userProfile={userProfile} 
                  onUpdate={fetchUserProfile}
                />
              )}
            </TabsContent>
            
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Segurança</CardTitle>
                  <CardDescription>
                    Proteja sua conta com autenticação de dois fatores
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="mfa-toggle" className="flex items-center gap-2">
                          <Shield className={mfaEnabled ? "h-4 w-4 text-green-600" : "h-4 w-4"} />
                          Autenticação de Dois Fatores (2FA)
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {mfaEnabled 
                            ? "Sua conta está protegida com 2FA" 
                            : "Adicione uma camada extra de segurança"}
                        </p>
                      </div>
                      <Switch
                        id="mfa-toggle"
                        checked={mfaEnabled}
                        onCheckedChange={handleToggleMFA}
                        disabled={mfaLoading}
                      />
                    </div>
                    
                    {mfaEnabled && (
                      <>
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-900">
                            Autenticação de dois fatores está ativa. 
                            Você precisará do seu aplicativo autenticador para fazer login.
                          </AlertDescription>
                        </Alert>
                        
                        <div className="space-y-2">
                          <Label>Fatores Configurados</Label>
                          <div className="space-y-2">
                            {factors.map((factor: any) => (
                              <div key={factor.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Key className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    Aplicativo Autenticador (TOTP)
                                    {factor.status === 'unverified' && (
                                      <span className="ml-2 text-xs text-amber-600">(Não verificado)</span>
                                    )}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {factor.status === 'verified' 
                                    ? `Ativo desde ${new Date(factor.created_at).toLocaleDateString('pt-BR')}`
                                    : 'Aguardando verificação'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {factors.some((f: any) => f.status === 'unverified') && (
                          <Button 
                            variant="outline" 
                            onClick={async () => {
                              await cleanupUnverifiedFactors();
                              await checkMFAStatus();
                              toast({
                                title: "Fatores não verificados removidos",
                                description: "Você pode tentar configurar o 2FA novamente.",
                              });
                            }}
                            className="w-full"
                            disabled={mfaLoading}
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Remover Fatores Não Verificados
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          onClick={handleGenerateBackupCodes}
                          className="w-full"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Gerar Novos Códigos de Backup
                        </Button>
                      </>
                    )}
                    
                    {!mfaEnabled && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Recomendamos ativar a autenticação de dois fatores para proteger sua conta contra acessos não autorizados.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-medium mb-3">Outras Configurações de Segurança</h4>
                    <Button variant="outline" disabled className="w-full">
                      Alterar Senha (Em breve)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="integrations">
              {userRole === 'owner' && (
                <FacebookIntegration />
              )}
              {userRole !== 'owner' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Integrações</CardTitle>
                    <CardDescription>
                      Configure integrações com serviços externos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Apenas administradores podem configurar integrações.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Preferências</CardTitle>
                  <CardDescription>
                    Personalize sua experiência no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      As configurações de preferências estarão disponíveis em breve.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* MFA Enrollment Dialog */}
      <Dialog open={showMFAEnrollment} onOpenChange={setShowMFAEnrollment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Configurar Autenticação de Dois Fatores</DialogTitle>
            <DialogDescription>Configure a autenticação de dois fatores para sua conta</DialogDescription>
          </DialogHeader>
          <MFAEnrollment
            onComplete={handleMFAEnrollmentComplete}
            onCancel={() => setShowMFAEnrollment(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novos Códigos de Backup</DialogTitle>
            <DialogDescription>
              Guarde estes códigos em um local seguro. Cada código pode ser usado apenas uma vez.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>IMPORTANTE:</strong> Estes códigos substituem quaisquer códigos anteriores.
                Os códigos antigos não funcionarão mais.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  <span className="font-semibold">{code}</span>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={copyBackupCodes}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button 
                variant="outline" 
                onClick={downloadBackupCodes}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
            
            <Button 
              className="w-full" 
              onClick={() => setShowBackupCodes(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}