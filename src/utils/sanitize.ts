// Input sanitization utilities

/**
 * Sanitize user input to prevent XSS attacks
 * This function removes or escapes potentially dangerous HTML/script content
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''

  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')

  // Escape special HTML characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')

  // Remove any javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove any data: protocols (can be used for XSS)
  sanitized = sanitized.replace(/data:/gi, '')

  // Remove any vbscript: protocols
  sanitized = sanitized.replace(/vbscript:/gi, '')

  // Remove any on* event handlers (onclick, onerror, etc)
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')

  return sanitized.trim()
}

/**
 * Validate and sanitize a message before sending to API
 * Returns null if message is invalid, sanitized message otherwise
 */
export function validateAndSanitizeMessage(
  message: string,
  maxLength: number
): { valid: boolean; sanitized: string; error?: string } {
  if (!message || !message.trim()) {
    return {
      valid: false,
      sanitized: '',
      error: 'Message cannot be empty'
    }
  }

  const trimmed = message.trim()

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      sanitized: '',
      error: `Message exceeds maximum length of ${maxLength} characters`
    }
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        sanitized: '',
        error: 'Message contains potentially harmful content'
      }
    }
  }

  const sanitized = sanitizeInput(trimmed)

  return {
    valid: true,
    sanitized
  }
}

/**
 * Sanitize display content from API responses
 * Less aggressive than input sanitization since we trust the API more
 */
export function sanitizeDisplayContent(content: string): string {
  if (!content) return ''

  // Only escape the most dangerous characters, allow normal text formatting
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
