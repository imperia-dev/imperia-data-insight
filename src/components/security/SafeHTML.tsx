import DOMPurify from 'dompurify';
import { useMemo } from 'react';

interface SafeHTMLProps {
  html: string;
  className?: string;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

// Configure DOMPurify defaults
DOMPurify.setConfig({
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'a', 'span', 'div'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
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
});

export function SafeHTML({ 
  html, 
  className,
  allowedTags,
  allowedAttributes 
}: SafeHTMLProps) {
  const sanitized = useMemo(() => {
    const config: any = {};
    
    if (allowedTags) {
      config.ALLOWED_TAGS = allowedTags;
    }
    
    if (allowedAttributes) {
      config.ALLOWED_ATTR = allowedAttributes;
    }

    // Add target="_blank" and rel="noopener noreferrer" to all links
    const clean = DOMPurify.sanitize(html, config);
    return clean.replace(
      /<a\s+href=/g,
      '<a target="_blank" rel="noopener noreferrer" href='
    );
  }, [html, allowedTags, allowedAttributes]);

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}