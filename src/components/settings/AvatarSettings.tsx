import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { Upload, Trash2, Sparkles, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

interface AvatarSettingsProps {
  userProfile: {
    full_name: string;
    avatar_url?: string | null;
    avatar_style?: string;
    avatar_color?: string;
    avatar_animation_preference?: {
      level: string;
      enabled: boolean;
    };
  };
  onUpdate: () => void;
}

export function AvatarSettings({ userProfile, onUpdate }: AvatarSettingsProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  
  const [avatarStyle, setAvatarStyle] = useState(userProfile.avatar_style || "initials");
  const [animationLevel, setAnimationLevel] = useState(
    userProfile.avatar_animation_preference?.level || "normal"
  );
  const [animationsEnabled, setAnimationsEnabled] = useState(
    userProfile.avatar_animation_preference?.enabled !== false
  );
  const [previewAvatar, setPreviewAvatar] = useState(userProfile.avatar_url);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    setUploading(true);

    try {
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          avatar_style: 'photo'
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setPreviewAvatar(publicUrl);
      setAvatarStyle('photo');
      toast.success("Avatar atualizado com sucesso!");
      onUpdate();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error("Erro ao fazer upload do avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          avatar_style: 'initials'
        })
        .eq('id', user?.id);

      if (error) throw error;

      setPreviewAvatar(null);
      setAvatarStyle('initials');
      toast.success("Avatar removido!");
      onUpdate();
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error("Erro ao remover avatar");
    }
  };

  const handleStyleChange = async (newStyle: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_style: newStyle
        })
        .eq('id', user?.id);

      if (error) throw error;

      setAvatarStyle(newStyle);
      toast.success("Estilo do avatar atualizado!");
      onUpdate();
    } catch (error) {
      console.error('Error updating avatar style:', error);
      toast.error("Erro ao atualizar estilo");
    }
  };

  const handleAnimationPreferenceChange = async () => {
    try {
      const newPreferences = {
        level: animationLevel,
        enabled: animationsEnabled
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_animation_preference: newPreferences
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success("Preferências de animação atualizadas!");
      onUpdate();
    } catch (error) {
      console.error('Error updating animation preferences:', error);
      toast.error("Erro ao atualizar preferências");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avatar e Personalização</CardTitle>
        <CardDescription>
          Personalize seu avatar e ajuste as animações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Preview */}
        <div className="flex items-center justify-center py-8">
          <div className="space-y-4">
            <div className="flex justify-center">
              <AnimatedAvatar
                src={avatarStyle === 'photo' ? previewAvatar : undefined}
                fallback={userProfile.full_name}
                size="xl"
                showStatus
                status="online"
                showPerformanceRing
                performanceScore={75}
                animationLevel={animationsEnabled ? animationLevel as any : "subtle"}
                style={avatarStyle as any}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Prévia do seu avatar
            </div>
          </div>
        </div>

        {/* Avatar Style */}
        <div className="space-y-3">
          <Label>Estilo do Avatar</Label>
          <RadioGroup value={avatarStyle} onValueChange={handleStyleChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="initials" id="initials" />
              <Label htmlFor="initials" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Iniciais
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="photo" id="photo" />
              <Label htmlFor="photo" className="flex items-center gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                Foto Personalizada
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="generated" id="generated" />
              <Label htmlFor="generated" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className="h-4 w-4" />
                Avatar Gerado
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Photo Upload */}
        {avatarStyle === 'photo' && (
          <div className="space-y-3">
            <Label>Foto do Perfil</Label>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Enviando..." : "Escolher Foto"}
              </Button>
              {previewAvatar && (
                <Button
                  variant="outline"
                  onClick={handleRemoveAvatar}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou GIF. Máximo 5MB.
            </p>
          </div>
        )}

        {/* Animation Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Animações</Label>
              <p className="text-sm text-muted-foreground">
                Ativar animações e efeitos visuais
              </p>
            </div>
            <Switch
              checked={animationsEnabled}
              onCheckedChange={(checked) => {
                setAnimationsEnabled(checked);
                handleAnimationPreferenceChange();
              }}
            />
          </div>

          {animationsEnabled && (
            <div className="space-y-3">
              <Label>Nível de Animação</Label>
              <RadioGroup 
                value={animationLevel} 
                onValueChange={(value) => {
                  setAnimationLevel(value);
                  handleAnimationPreferenceChange();
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subtle" id="subtle" />
                  <Label htmlFor="subtle" className="cursor-pointer">
                    Sutil - Animações mínimas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="normal" />
                  <Label htmlFor="normal" className="cursor-pointer">
                    Normal - Animações balanceadas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fun" id="fun" />
                  <Label htmlFor="fun" className="cursor-pointer">
                    Divertido - Animações completas
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}