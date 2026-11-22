import sanitizeHtml from 'sanitize-html'
export function cleanText(value) {
  if (typeof value !== 'string') return value

  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    // Without this, sanitize-html leaves the text of a <script> behind.
    nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
  }).trim()
}
export function sanitizeBody(...fields) {
  return function sanitizeRequest(req, _res, next) {
    if (req.body && typeof req.body === 'object') {
      for (const field of fields) {
        if (typeof req.body[field] === 'string') {
          req.body[field] = cleanText(req.body[field])
        }
      }
    }
    next()
  }
}
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
