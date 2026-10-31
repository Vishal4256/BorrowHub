/**
 * URL and image security validation utility
 * Validates that image URLs use secure protocols and valid extensions or internal upload paths.
 */
export function isValidImageUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;

  const trimmed = urlString.trim();

  // Allow relative upload URLs served by the local backend upload service
  if (trimmed.startsWith('/uploads/')) {
    // Prevent directory traversal attacks
    if (trimmed.includes('..') || trimmed.includes('\\')) return false;
    return /^\/uploads\/[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp|gif)$/i.test(trimmed);
  }

  // Parse external full URLs
  try {
    const parsed = new URL(trimmed);

    // Protocol must strictly be http: or https: (blocks javascript:, data:, file:, etc.)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Hostname must exist and not be localhost in production unless explicitly permitted
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return false;
    }

    // Explicitly disallow SVG files as user-provided uploads due to embedded XSS scripting risks
    if (parsed.pathname.toLowerCase().endsWith('.svg')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

