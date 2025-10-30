import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export async function uploadAnnouncementImage(file: File): Promise<string> {
  // Validar tamanho
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A imagem deve ter no máximo 5MB");
  }

  // Validar formato
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Formato não suportado. Use JPG, PNG, WEBP ou GIF");
  }

  // Gerar nome único
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExt = file.name.split(".").pop();
  const fileName = `${timestamp}-${randomString}.${fileExt}`;

  // Upload para storage
  const { data, error } = await supabase.storage
    .from("announcement-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error("Erro ao fazer upload da imagem");
  }

  // Obter URL pública
  const { data: { publicUrl } } = supabase.storage
    .from("announcement-images")
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function deleteAnnouncementImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  try {
    // Extrair o path da URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/announcement-images\/(.+)$/);
    
    if (!pathMatch || !pathMatch[1]) {
      console.warn("Could not extract file path from URL:", imageUrl);
      return;
    }

    const filePath = pathMatch[1];

    // Deletar do storage
    const { error } = await supabase.storage
      .from("announcement-images")
      .remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      throw new Error("Erro ao deletar imagem");
    }
  } catch (error) {
    console.error("Error deleting announcement image:", error);
    // Não lançar erro aqui para não bloquear outras operações
  }
}
