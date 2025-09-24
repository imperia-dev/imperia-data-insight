import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UploadOptions {
  bucket: string;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  generateSignedUrl?: boolean;
  signedUrlExpiresIn?: number; // in seconds
}

interface UploadResult {
  success: boolean;
  filePath?: string;
  signedUrl?: string;
  error?: string;
}

const DEFAULT_OPTIONS: Partial<UploadOptions> = {
  maxSize: 10, // 10MB default
  generateSignedUrl: true,
  signedUrlExpiresIn: 300 // 5 minutes
};

// Default allowed MIME types
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];

export async function secureFileUpload(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const allowedTypes = config.allowedTypes || DEFAULT_ALLOWED_TYPES;

  try {
    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(', ')}`
      };
    }

    // Validate file size
    const maxSizeBytes = (config.maxSize || 10) * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        success: false,
        error: `Arquivo muito grande. Tamanho máximo: ${config.maxSize}MB`
      };
    }

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        error: 'Você precisa estar autenticado para fazer upload de arquivos'
      };
    }

    // Call secure upload Edge Function
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', options.bucket);

    const response = await supabase.functions.invoke('secure-upload', {
      body: formData
    });

    if (response.error) {
      console.error('Upload error:', response.error);
      return {
        success: false,
        error: response.error.message || 'Erro ao fazer upload do arquivo'
      };
    }

    const { file_path, signed_url } = response.data;

    // Log successful upload
    await supabase.from('audit_logs').insert({
      table_name: 'storage',
      operation: 'upload',
      user_id: session.user.id,
      accessed_fields: [options.bucket, file_path]
    });

    return {
      success: true,
      filePath: file_path,
      signedUrl: signed_url
    };

  } catch (error) {
    console.error('Secure upload error:', error);
    return {
      success: false,
      error: 'Erro inesperado ao fazer upload do arquivo'
    };
  }
}

// Helper function to generate signed URL for existing files
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 300
): Promise<{ signedUrl?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error generating signed URL:', error);
      return { error: error.message };
    }

    return { signedUrl: data.signedUrl };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return { error: 'Erro ao gerar URL de acesso' };
  }
}

// Helper function to validate file before upload
export function validateFile(
  file: File,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }
): { valid: boolean; error?: string } {
  const maxSize = options?.maxSize || 10;
  const allowedTypes = options?.allowedTypes || DEFAULT_ALLOWED_TYPES;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
    };
  }

  // Check file size
  const maxSizeBytes = maxSize * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSize}MB`
    };
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.\./g, // Path traversal
    /[<>:"|?*]/g, // Invalid characters
    /\.(exe|bat|cmd|sh|ps1|vbs|js)$/i // Executable extensions
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      return {
        valid: false,
        error: 'Nome de arquivo inválido ou potencialmente perigoso'
      };
    }
  }

  return { valid: true };
}