import DOMPurify from 'dompurify';
import { useCallback } from 'react';

interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  allowScripts?: boolean;
  allowStyles?: boolean;
}

export function useSanitize() {
  const sanitizeHTML = useCallback((dirty: string, options?: SanitizeOptions) => {
    const config: any = {
      ALLOWED_TAGS: options?.allowedTags || ['p', 'br', 'strong', 'em', 'u', 'a', 'span'],
      ALLOWED_ATTR: options?.allowedAttributes || ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SAFE_FOR_TEMPLATES: true,
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      FORCE_BODY: true,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
      IN_PLACE: false
    };

    if (!options?.allowScripts) {
      config.FORBID_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'link'];
      config.FORBID_ATTR = ['onerror', 'onload', 'onclick', 'onmouseover'];
    }

    if (!options?.allowStyles) {
      config.FORBID_ATTR = [...(config.FORBID_ATTR || []), 'style'];
    }

    return DOMPurify.sanitize(dirty, config);
  }, []);

  const sanitizeText = useCallback((text: string) => {
    // Remove all HTML tags and return plain text
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }, []);

  const sanitizeURL = useCallback((url: string) => {
    // Only allow http, https, and mailto protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    try {
      const parsed = new URL(url);
      if (!allowedProtocols.includes(parsed.protocol)) {
        return '';
      }
      return url;
    } catch {
      // If it's not a valid URL, return empty string
      return '';
    }
  }, []);

  const sanitizeFileName = useCallback((filename: string) => {
    // Remove any path traversal attempts and special characters
    return filename
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255); // Limit filename length
  }, []);

  return {
    sanitizeHTML,
    sanitizeText,
    sanitizeURL,
    sanitizeFileName
  };
}