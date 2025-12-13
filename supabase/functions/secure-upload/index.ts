import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
import { sanitizeInput } from '../_shared/sanitization.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed MIME types and extensions
const ALLOWED_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv']
};

// Dangerous patterns to check in files (malware signatures and malicious code)
const DANGEROUS_PATTERNS = [
  // Script injections
  /<script[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<embed/gi,
  /<object/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /expression\s*\(/gi,
  
  // Malware signatures - common malware indicators (EICAR test signature)
  /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/gi
];

// Maximum file sizes by type (in bytes)
const MAX_SIZES = {
  image: 10 * 1024 * 1024, // 10MB for images
  document: 50 * 1024 * 1024, // 50MB for documents
  default: 5 * 1024 * 1024 // 5MB default
};

function getMaxSize(mimeType: string): number {
  if (mimeType.startsWith('image/')) return MAX_SIZES.image;
  if (mimeType.startsWith('application/')) return MAX_SIZES.document;
  return MAX_SIZES.default;
}

function generateSecureFilename(originalName: string): string {
  const ext = originalName.substring(originalName.lastIndexOf('.'));
  const uuid = crypto.randomUUID();
  return `${uuid}${ext}`;
}

function validateMimeType(buffer: Uint8Array, declaredType: string): boolean {
  // Magic number validation for common file types
  const magicNumbers: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38]],
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  };

  const signatures = magicNumbers[declaredType];
  if (!signatures) return true; // Skip validation for types without magic numbers

  return signatures.some(signature => 
    signature.every((byte, index) => buffer[index] === byte)
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'uploads';
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize filename for logs
    const sanitizedFilename = sanitizeInput(file.name);

    // Validate file type
    const mimeType = file.type;
    if (!ALLOWED_TYPES[mimeType as keyof typeof ALLOWED_TYPES]) {
      await supabase.from('security_events').insert({
        event_type: 'upload_blocked',
        severity: 'warning',
        user_id: user.id,
        details: {
          filename: sanitizedFilename,
          mime_type: mimeType,
          reason: 'Invalid file type'
        }
      });

      return new Response(
        JSON.stringify({ error: 'File type not allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check file size
    const maxSize = getMaxSize(mimeType);
    if (file.size > maxSize) {
      await supabase.from('security_events').insert({
        event_type: 'upload_blocked',
        severity: 'warning',
        user_id: user.id,
        details: {
          filename: sanitizedFilename,
          size: file.size,
          max_size: maxSize,
          reason: 'File too large'
        }
      });

      return new Response(
        JSON.stringify({ error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Validate magic numbers
    if (!validateMimeType(buffer, mimeType)) {
      await supabase.from('security_events').insert({
        event_type: 'upload_blocked',
        severity: 'high',
        user_id: user.id,
        details: {
          filename: sanitizedFilename,
          declared_type: mimeType,
          reason: 'MIME type mismatch - possible malicious file'
        }
      });

      return new Response(
        JSON.stringify({ error: 'File content does not match declared type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for dangerous patterns in text-based files
    if (mimeType.startsWith('text/') || mimeType === 'image/svg+xml') {
      const textContent = new TextDecoder().decode(buffer);
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(textContent)) {
          await supabase.from('security_events').insert({
            event_type: 'upload_blocked',
            severity: 'critical',
            user_id: user.id,
            details: {
              filename: sanitizedFilename,
              mime_type: mimeType,
              reason: 'Dangerous content detected'
            }
          });

          return new Response(
            JSON.stringify({ error: 'File contains potentially dangerous content' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Generate secure filename
    const secureFilename = generateSecureFilename(file.name);
    const filePath = `${user.id}/${secureFilename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL (expires in 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 300);

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate signed URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful upload
    await supabase.from('audit_logs').insert({
      table_name: 'storage',
      operation: 'upload',
      user_id: user.id,
      accessed_fields: [bucket, filePath]
    });

    return new Response(
      JSON.stringify({
        success: true,
        file_path: filePath,
        signed_url: signedUrlData.signedUrl,
        expires_in: 300
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Secure upload error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});