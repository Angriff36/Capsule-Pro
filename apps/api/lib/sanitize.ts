/**
 * Strip HTML tags and sanitize plain text input to prevent stored XSS.
 * Removes < > & " ' characters that could be interpreted as HTML/JS.
 * Also trims whitespace and enforces maximum length.
 */
export function sanitizeText(input: string, maxLength = 1000): string {
  if (typeof input !== "string") return "";
  let sanitized = input.trim();
  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, "");
  // Encode dangerous characters that could enable XSS
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

/**
 * Validate and sanitize an email address.
 * Returns the sanitized email or empty string if invalid.
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") return "";
  const trimmed = email.trim().toLowerCase();
  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return "";
  if (trimmed.length > 254) return "";
  return trimmed;
}
