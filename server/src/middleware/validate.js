/**
 * Request validation — level 2 of 3.
 *
 *   1. React form       immediate feedback, no round trip        (client/src/utils/validate.js)
 *   2. THIS FILE        rejects bad requests before any model
 *   3. Mongoose schema  the database's own guarantee             (server/src/models/*.js)
 *
 * Why all three? Level 1 is politeness — it can be bypassed by anyone with
 * devtools or curl, so it is never a control. Level 3 is the real guarantee,
 * but it only speaks in Mongoose's own error shapes and only fires once a
 * model is involved. Level 2 sits between them: it rejects nonsense early,
 * cheaply, with a message written for a person, and it covers things a
 * schema cannot see — like "newPassword must match confirmPassword".
 *
 * Every failure answers 400 with a `fields` object the React form can read
 * straight into its per-input error state:
 *
 *   { "error": "Please fix the highlighted fields.",
 *     "fields": { "email": "Enter a valid email address" } }
 */

const EMAIL = /.+@.+\..+/
const USERNAME = /^[A-Za-z0-9_]+$/

/** True for values the user simply did not supply. */
function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}

/**
 * Each rule is a function (value, body) that returns an error message when
 * the value is wrong, or null when it is fine. Rules that are not `required`
 * pass on a blank value, so optional fields work without extra ceremony.
 */
export const rule = {
  required:
    (message = 'This field is required') =>
    (value) =>
      isBlank(value) ? message : null,

  string:
    (message = 'Must be text') =>
    (value) =>
      isBlank(value) || typeof value === 'string' ? null : message,

  minLength: (n, message) => (value) =>
    isBlank(value) || String(value).trim().length >= n
      ? null
      : message || `Must be at least ${n} characters`,

  maxLength: (n, message) => (value) =>
    isBlank(value) || String(value).trim().length <= n
      ? null
      : message || `Cannot be longer than ${n} characters`,

  match: (regex, message) => (value) =>
    isBlank(value) || regex.test(String(value)) ? null : message,

  email:
    (message = 'Enter a valid email address') =>
    (value) =>
      isBlank(value) || EMAIL.test(String(value)) ? null : message,

  username:
    (message = 'Letters, numbers and underscores only') =>
    (value) =>
      isBlank(value) || USERNAME.test(String(value)) ? null : message,

  oneOf: (values, message) => (value) =>
    isBlank(value) || values.includes(value)
      ? null
      : message || `Must be one of: ${values.join(', ')}`,

  integer:
    ({ min, max } = {}, message) =>
    (value) => {
      if (isBlank(value)) return null
      const n = Number(value)
      if (!Number.isInteger(n)) return message || 'Must be a whole number'
      if (min !== undefined && n < min) return message || `Must be at least ${min}`
      if (max !== undefined && n > max) return message || `Must be at most ${max}`
      return null
    },

  boolean:
    (message = 'Must be true or false') =>
    (value) =>
      isBlank(value) || typeof value === 'boolean' ? null : message,

  array:
    ({ min, max, unique = false } = {}, message) =>
    (value) => {
      if (isBlank(value)) return null
      if (!Array.isArray(value)) return message || 'Must be a list'
      if (min !== undefined && value.length < min) return message || `Pick at least ${min}`
      if (max !== undefined && value.length > max) return message || `Pick at most ${max}`
      if (unique && new Set(value).size !== value.length) return message || 'No duplicates allowed'
      return null
    },

  isoDate:
    (message = 'Enter a valid date') =>
    (value) =>
      isBlank(value) || !Number.isNaN(new Date(value).getTime()) ? null : message,

  /** For rules that need another field, like a password confirmation. */
  matchesField: (otherField, message) => (value, body) =>
    isBlank(value) || value === body?.[otherField] ? null : message,
}

/**
 * Builds middleware from a map of field name to a list of rules.
 *
 *   router.post('/', validate({ body: [rule.required(), rule.maxLength(1000)] }), controller)
 *
 * Rules run in order and the first failure wins, so a blank field reports
 * "required" rather than also complaining about its length.
 */
export function validate(schema) {
  return function validateRequest(req, res, next) {
    const fields = {}

    for (const [field, checks] of Object.entries(schema)) {
      const value = req.body?.[field]

      for (const check of checks) {
        const message = check(value, req.body ?? {})
        if (message) {
          fields[field] = message
          break
        }
      }
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields })
    }

    next()
  }
}

/**
 * Validates a route parameter that should be a Mongo ObjectId.
 *
 * Without this, a request for /api/posts/banana reaches Mongoose, which
 * throws a CastError — a 500-shaped problem for what is really a 400.
 */
const OBJECT_ID = /^[a-f\d]{24}$/i

export function validateObjectId(param = 'id') {
  return function checkId(req, res, next) {
    if (!OBJECT_ID.test(String(req.params[param] ?? ''))) {
      return res.status(400).json({ error: `'${req.params[param]}' is not a valid id.` })
    }
    next()
  }
}
