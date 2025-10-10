import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Copy, Check, Loader2, Image as ImageIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BUCKET_NAME = "company-assets";
const FILE_NAME = "email-logo.png";

export const CompanyLogoUpload = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Generate the public URL
  const publicUrl = `https://agttqqaampznczkyfvkf.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${FILE_NAME}`;

  // Check if logo exists on mount
  useEffect(() => {
    const checkExistingLogo = async () => {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .list("", {
            search: FILE_NAME,
          });

        if (!error && data && data.length > 0) {
          // Logo exists, set the URL with cache buster
          const cacheBuster = `?t=${Date.now()}`;
          setLogoUrl(publicUrl + cacheBuster);
        }
      } catch (error) {
        console.error("Error checking existing logo:", error);
      } finally {
        setLoading(false);
      }
    };

    checkExistingLogo();
  }, [publicUrl]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem PNG, JPG ou SVG",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A logo deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload the file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);

    try {
      // Remove existing file if it exists
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([FILE_NAME]);

      if (deleteError && deleteError.message !== "Object not found") {
        console.error("Error deleting old logo:", deleteError);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(FILE_NAME, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Add cache buster to force reload
      const cacheBuster = `?t=${Date.now()}`;
      setLogoUrl(publicUrl + cacheBuster);

      toast({
        title: "Logo enviada com sucesso!",
        description: "A logo da empresa foi atualizada.",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Erro ao enviar logo",
        description: error.message || "Ocorreu um erro ao fazer upload da logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({
      title: "URL copiada!",
      description: "A URL da logo foi copiada para a área de transferência",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="logo-upload">Selecionar Logo</Label>
          <div className="mt-2 flex items-center gap-4">
            <Input
              id="logo-upload"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={handleFileSelect}
              disabled={uploading}
              className="max-w-md"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="outline"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Escolher Arquivo
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Formatos aceitos: PNG, JPG, SVG (máx. 5MB)
          </p>
        </div>

        {previewUrl && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <Label className="mb-2 block">Preview da Logo</Label>
            <div className="flex items-center justify-center p-4 bg-background rounded">
              <img
                src={previewUrl}
                alt="Preview da logo"
                className="max-h-32 object-contain"
              />
            </div>
          </div>
        )}

        {logoUrl && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <Label className="mb-2 block">Logo Atual</Label>
            <div className="flex items-center justify-center p-4 bg-background rounded mb-4">
              <img
                src={logoUrl}
                alt="Logo da empresa"
                className="max-h-32 object-contain"
              />
            </div>
          </div>
        )}
      </div>

      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">URL Pública da Logo:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-sm break-all">
                {publicUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyUrl}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Use esta URL no template de email do Supabase Dashboard
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
