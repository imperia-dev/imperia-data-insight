import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Moon, Sun, AlertCircle } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MFAChallenge } from "@/components/mfa/MFAChallenge";
import { BackupCodeChallenge } from "@/components/mfa/BackupCodeChallenge";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { useMFA } from "@/hooks";
import { logger } from "@/utils/logger";
import { emailSchema } from "@/lib/validations/auth";
import { sanitizedNameSchema } from "@/lib/validations/sanitized";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Schema de validação para signup com sanitização
const signupFormSchema = z.object({
  fullName: sanitizedNameSchema,
  email: emailSchema,
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  phone: z.string().optional(),
});

// Schema para login
const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
});

type SignupFormData = z.infer<typeof signupFormSchema>;
type LoginFormData = z.infer<typeof loginFormSchema>;

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMFAChallenge, setShowMFAChallenge] = useState(false);
  const [showBackupCodeChallenge, setShowBackupCodeChallenge] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaChallengeId, setMfaChallengeId] = useState<string>("");
  const [rateLimitCooldown, setRateLimitCooldown] = useState<number>(0);
  const [lastSignupAttempt, setLastSignupAttempt] = useState<number>(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { verifyChallenge, verifyBackupCode } = useMFA();

  // Forms com validação e sanitização
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Cooldown timer effect
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;

    const timer = setInterval(() => {
      setRateLimitCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

  useEffect(() => {
    // Check system preference for dark mode
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDarkMode(prefersDark);
    
    // Apply theme class to root
    if (prefersDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Block navigation during MFA challenge
  useEffect(() => {
    if (!showMFAChallenge) return;

    // Prevent browser back/forward/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    // Prevent programmatic navigation
    const handlePopState = (e: PopStateEvent) => {
      if (showMFAChallenge) {
        const confirmLeave = window.confirm(
          "Você precisa completar a autenticação de dois fatores antes de continuar. Deseja realmente sair?"
        );
        
        if (!confirmLeave) {
          // Push the current state back
          window.history.pushState(null, '', window.location.href);
        } else {
          // Clear session and allow navigation
          supabase.auth.signOut();
        }
      }
    };

    // Add current state to history to detect back button
    window.history.pushState(null, '', window.location.href);
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showMFAChallenge]);

  // Monitor route changes and redirect back if trying to leave during MFA
  useEffect(() => {
    if (showMFAChallenge && location.pathname !== '/auth') {
      navigate('/auth', { replace: true });
    }
  }, [location.pathname, showMFAChallenge, navigate]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSignUp = async (data: SignupFormData) => {
    // Check if in cooldown period
    if (rateLimitCooldown > 0) {
      toast({
        title: "Aguarde",
        description: `Por favor, aguarde ${rateLimitCooldown} segundos antes de tentar novamente.`,
        variant: "destructive",
      });
      return;
    }

    // Prevent rapid successive attempts (minimum 3 seconds between attempts)
    const now = Date.now();
    if (now - lastSignupAttempt < 3000) {
      toast({
        title: "Muitas tentativas",
        description: "Por favor, aguarde alguns segundos entre as tentativas.",
        variant: "destructive",
      });
      return;
    }

    setLastSignupAttempt(now);
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/pending-approval`;
      
      // Data already sanitized by zod schema
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: data.fullName,
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Usuário já cadastrado",
            description: "Este email já está cadastrado. Tente fazer login.",
            variant: "destructive",
          });
        } else if (error.message.toLowerCase().includes("rate limit") || 
                   error.message.toLowerCase().includes("too many") ||
                   error.message.toLowerCase().includes("email rate limit exceeded") ||
                   error.message.includes("429")) {
          setRateLimitCooldown(300);
          
          toast({
            title: "Limite de tentativas excedido",
            description: "Você atingiu o limite de cadastros. Por favor, aguarde 5 minutos antes de tentar novamente.",
            variant: "destructive",
            duration: 8000,
          });
        } else {
          toast({
            title: "Erro no cadastro",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }
      
      if (authData.user) {
        if (data.phone) {
          const phoneDigits = data.phone.replace(/\D/g, '');
          const formattedPhone = phoneDigits ? `+55${phoneDigits}` : '';
          
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              phone_number: formattedPhone,
              phone_verified: false 
            })
            .eq('id', authData.user.id);
          
          if (profileError) {
            logger.error('Error updating phone number');
          }
        }
        
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Verifique seu email para confirmar o cadastro. Após a confirmação, aguarde a aprovação do administrador.",
        });
        
        signupForm.reset();
        navigate("/pending-approval");
      }
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (data: LoginFormData) => {
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes('mfa') || error.message.includes('factor')) {
          const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
          
          if (!factorsError && factorsData?.all && factorsData.all.length > 0) {
            const verifiedFactors = factorsData.all.filter(f => f.status === 'verified');
            if (verifiedFactors.length > 0) {
              setMfaFactors(verifiedFactors);
              setShowMFAChallenge(true);
              setLoading(false);
              return;
            }
          }
        }
        
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Credenciais inválidas",
            description: "Email ou senha incorretos. Verifique e tente novamente.",
            variant: "destructive",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email não confirmado",
            description: "Por favor, verifique seu email para confirmar o cadastro.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro no login",
            description: error.message,
            variant: "destructive",
          });
        }
      } else if (authData.user) {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = factorsData?.all?.filter(f => f.status === 'verified') || [];

        if (verifiedFactors.length > 0) {
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

          if (aalData?.currentLevel !== 'aal2') {
            setMfaFactors(verifiedFactors);
            setShowMFAChallenge(true);
            setLoading(false);
            return;
          }
        }

        const audio = new Audio('/login-success.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando...",
        });
        loginForm.reset();
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (code: string): Promise<boolean> => {
    if (!mfaFactors || mfaFactors.length === 0) return false;
    
    try {
      setLoading(true);
      
      // Challenge the first TOTP factor
      const factor = mfaFactors.find(f => f.factor_type === 'totp');
      if (!factor) return false;
      
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });
      
      if (challengeError) throw challengeError;
      
      // Store challenge ID
      const challengeId = challengeData.id;
      setMfaChallengeId(challengeId);
      
      // Verify the code
      const success = await verifyChallenge(factor.id, code, challengeId);
      
      if (success) {
        // Play login success sound
        const audio = new Audio('/login-success.mp3');
        audio.play().catch(() => logger.debug('Could not play audio'));
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Verificação em duas etapas concluída.",
        });
        
        navigate("/");
        return true;
      }
      
      return false;
    } catch (error: any) {
      logger.error('MFA verification failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleBackupCodeVerify = async (code: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const success = await verifyBackupCode(code);
      
      if (success) {
        // Get current form values for retry
        const formValues = loginForm.getValues();
        const { error } = await supabase.auth.signInWithPassword({
          email: formValues.email,
          password: formValues.password,
        });
        
        if (!error) {
          // Play login success sound
          const audio = new Audio('/login-success.mp3');
          audio.play().catch(() => logger.debug('Could not play audio'));
          
          toast({
            title: "Login realizado com sucesso!",
            description: "Código de backup verificado.",
          });
          
          navigate("/");
          return true;
        }
      }
      
      return false;
    } catch (error: any) {
      logger.error('Backup code verification failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/pending-approval`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        toast({
          title: "Erro ao fazer login com Google",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao tentar fazer login com Google.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If MFA challenge is needed, show MFA screen
  if (showMFAChallenge && !showBackupCodeChallenge) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        {/* Background Image with brightness filter */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: isDarkMode 
              ? 'url("/lovable-uploads/e9dd7cb6-a338-4546-aaa5-61c39e9bb699.png")' 
              : 'url("/lovable-uploads/cbd3d7f0-a336-4830-87a0-3f375a982751.png")',
            filter: 'brightness(0.4)'
          }}
        />
        
        {/* MFA Challenge */}
        <div className="relative z-10">
          <MFAChallenge
            onVerify={handleMFAVerify}
            onUseBackupCode={() => setShowBackupCodeChallenge(true)}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  // If backup code challenge is needed
  if (showBackupCodeChallenge) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        {/* Background Image with brightness filter */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: isDarkMode 
              ? 'url("/lovable-uploads/e9dd7cb6-a338-4546-aaa5-61c39e9bb699.png")' 
              : 'url("/lovable-uploads/cbd3d7f0-a336-4830-87a0-3f375a982751.png")',
            filter: 'brightness(0.4)'
          }}
        />
        
        {/* Backup Code Challenge */}
        <div className="relative z-10">
          <BackupCodeChallenge
            onVerify={handleBackupCodeVerify}
            onBack={() => setShowBackupCodeChallenge(false)}
            loading={loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image with brightness filter */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{
          backgroundImage: isDarkMode 
            ? `url(/lovable-uploads/1d2d4e7e-ccff-43f0-9ceb-df4fc46cc319.png)`
            : `url(/lovable-uploads/e9dd7cb6-a338-4546-aaa5-61c39e9bb699.png)`,
          filter: isDarkMode ? 'brightness(0.6)' : 'brightness(0.9)',
        }}
      />
      
      {/* Theme Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm border border-border"
        onClick={toggleTheme}
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>

      {/* Content */}
      <Card className="w-full max-w-md relative z-10 bg-background/95 backdrop-blur-sm border-border">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center mb-2">
            <Logo size="lg" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl text-center font-bold">
              Portal de Gestão
            </CardTitle>
            <CardDescription className="text-center">
              Entre ou crie sua conta para continuar
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            disabled={loading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Sua senha"
                              disabled={loading}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-muted-foreground hover:text-primary"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Esqueceu sua senha?
                    </Button>
                  </div>
                </form>
              </Form>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou continue com
                  </span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                >
                  <path
                    fill="currentColor"
                    d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                  />
                </svg>
                {loading ? "Conectando..." : "Login com Google"}
              </Button>
            </TabsContent>
            
            <TabsContent value="signup">
              {rateLimitCooldown > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Limite de tentativas atingido. Aguarde{" "}
                    <strong>
                      {Math.floor(rateLimitCooldown / 60)}:
                      {(rateLimitCooldown % 60).toString().padStart(2, '0')}
                    </strong>{" "}
                    para tentar novamente.
                  </AlertDescription>
                </Alert>
              )}
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Seu nome completo"
                            disabled={loading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            disabled={loading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone (opcional)</FormLabel>
                        <FormControl>
                          <PhoneInput
                            id="phone"
                            value={field.value || ""}
                            onChange={field.onChange}
                            disabled={loading}
                            placeholder="(11) 98765-4321"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Usado para recuperação de senha via SMS
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Mínimo 6 caracteres"
                              disabled={loading}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || rateLimitCooldown > 0}
                  >
                    {rateLimitCooldown > 0 ? (
                      <>
                        Aguarde {Math.floor(rateLimitCooldown / 60)}:
                        {(rateLimitCooldown % 60).toString().padStart(2, '0')}
                      </>
                    ) : loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      "Cadastrar"
                    )}
                  </Button>
                </form>
              </Form>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou continue com
                  </span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                >
                  <path
                    fill="currentColor"
                    d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                  />
                </svg>
                {loading ? "Conectando..." : "Cadastrar com Google"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          <p className="w-full">
            Ao continuar, você concorda com nossos{" "}
            <a href="#" className="underline hover:text-primary">
              Termos de Serviço
            </a>{" "}
            e{" "}
            <a href="#" className="underline hover:text-primary">
              Política de Privacidade
            </a>
          </p>
        </CardFooter>
      </Card>
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
}
