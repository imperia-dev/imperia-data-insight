import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type StorageImageProps = {
  bucket: string;
  pathOrUrl: string;
  alt: string;
  className?: string;
  expiresInSeconds?: number;
  onError?: () => void;
};

function parseSupabasePublicUrl(url: string): { bucket: string; key: string } | null {
  const marker = "/storage/v1/object/public/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  const rest = url.slice(idx + marker.length);
  const parts = rest.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const [bucket, ...keyParts] = parts;
  return { bucket, key: keyParts.join("/") };
}

export function StorageImage({
  bucket,
  pathOrUrl,
  alt,
  className,
  expiresInSeconds = 60 * 60,
  onError,
}: StorageImageProps) {
  const [src, setSrc] = useState<string>("");

  const input = useMemo(() => pathOrUrl.trim(), [pathOrUrl]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!input) {
        setSrc("");
        return;
      }

      // Already a signed URL or any non-supabase URL
      if (input.startsWith("http")) {
        const parsed = parseSupabasePublicUrl(input);
        if (!parsed) {
          setSrc(input);
          return;
        }

        // If it's a Supabase public URL, try to convert to signed URL
        const bucketToUse = parsed.bucket || bucket;
        const { data, error } = await supabase.storage
          .from(bucketToUse)
          .createSignedUrl(parsed.key, expiresInSeconds);

        if (cancelled) return;
        if (error || !data?.signedUrl) {
          // Fallback to original URL
          setSrc(input);
          return;
        }

        setSrc(data.signedUrl);
        return;
      }

      // Treat as storage key
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(input, expiresInSeconds);

      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setSrc("");
        return;
      }

      setSrc(data.signedUrl);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [bucket, expiresInSeconds, input]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={cn(className)}
      loading="lazy"
      onError={onError}
    />
  );
}
