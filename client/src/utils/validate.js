/**
 * Form validation — level 1 of 3.
 *
 *   1. THIS FILE          immediate feedback, no round trip
 *   2. route validators   server/src/middleware/validate.js
 *   3. Mongoose schemas   server/src/models/*.js
 *
 * The rules here are deliberately the SAME rules and the same limits as the
 * server's. That is not duplication for its own sake — the two levels do
 * different jobs:
 *
 *   This file exists so a person who leaves the email box empty is told so
 *   instantly, instead of waiting for a round trip to be told something a
 *   form could have known on its own.
 *
 *   The server exists because this file is not a control. It runs in the
 *   visitor's browser, which means it runs on the attacker's computer. It can
 *   be edited in devtools, or skipped entirely with curl. Anything that
 *   matters is checked again on the server, and again by the schema.
 *
 *   If the limits ever disagree, the server wins and the user sees a
 *   confusing error. So when a limit changes in one place, change it in both
 *   — the constants below name every one of them in a single block for
 *   exactly that reason.
 */

/** Every length limit in the app, matching server/src/models/*.js. */
export const LIMITS = {
  username: { min: 3, max: 20 },
  password: { min: 8, max: 100 },
  displayName: { max: 40 },
  bio: { max: 200 },
  postBody: { min: 2, max: 1000 },
  commentBody: { min: 2, max: 500 },
  communityName: { min: 3, max: 50 },
  communityDescription: { max: 280 },
  meetupTitle: { min: 4, max: 80 },
  meetupLocation: { max: 120 },
  meetupDescription: { max: 400 },
  reportReason: { min: 4, max: 300 },
  favourites: { max: 60 },
}

const EMAIL = /.+@.+\..+/
const USERNAME = /^[A-Za-z0-9_]+$/

const isBlank = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/**
 * The same rule vocabulary as the server's validate.js, so a schema written
 * for one reads the same as a schema written for the other.
 */
export const rule = {
  required:
    (message = 'This field is required') =>
    (value) =>
      isBlank(value) ? message : null,

  minLength: (n, message) => (value) =>
    isBlank(value) || String(value).trim().length >= n
      ? null
      : message || `Must be at least ${n} characters`,

  maxLength: (n, message) => (value) =>
    isBlank(value) || String(value).trim().length <= n
      ? null
      : message || `Cannot be longer than ${n} characters`,

  email:
    (message = 'Enter a valid email address') =>
    (value) =>
      isBlank(value) || EMAIL.test(String(value)) ? null : message,

  username:
    (message = 'Letters, numbers and underscores only') =>
    (value) =>
      isBlank(value) || USERNAME.test(String(value)) ? null : message,

  match: (regex, message) => (value) =>
    isBlank(value) || regex.test(String(value)) ? null : message,

  oneOf: (values, message) => (value) =>
    isBlank(value) || values.includes(value) ? null : message || 'Not one of the choices',

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

  array:
    ({ min, max, unique = false } = {}, message) =>
    (value) => {
      if (isBlank(value)) return null
      if (!Array.isArray(value)) return message || 'Must be a list'
      if (min !== undefined && value.length < min) return message || `Pick at least ${min}`
      if (max !== undefined && value.length > max) return message || `Pick at most ${max}`
      if (unique && new Set(value).size !== value.length) return message || 'No duplicates'
      return null
    },

  futureDate:
    (message = 'Pick a time in the future') =>
    (value) => {
      if (isBlank(value)) return null
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return 'Enter a valid date and time'
      return date.getTime() > Date.now() ? null : message
    },

  matchesField: (otherField, message) => (value, values) =>
    isBlank(value) || value === values?.[otherField] ? null : message,
}

/**
 * Runs a schema over a values object.
 * Returns { ok, errors } where errors is keyed by field, exactly like the
 * server's reply — so a form can show server and client errors with the
 * same code.
 */
export function validateForm(schema, values) {
  const errors = {}

  for (const [field, checks] of Object.entries(schema)) {
    for (const check of checks) {
      const message = check(values?.[field], values ?? {})
      if (message) {
        errors[field] = message
        break
      }
    }
  }

  return { ok: Object.keys(errors).length === 0, errors }
}

/* ------------------------------------------------------------------ */
/*  The schemas, one per form                                          */
/* ------------------------------------------------------------------ */

export const schemas = {
  register: {
    email: [rule.required('Enter your email'), rule.email()],
    username: [
      rule.required('Pick a username'),
      rule.minLength(LIMITS.username.min, `At least ${LIMITS.username.min} characters`),
      rule.maxLength(LIMITS.username.max, `At most ${LIMITS.username.max} characters`),
      rule.username(),
    ],
    password: [
      rule.required('Choose a password'),
      rule.minLength(LIMITS.password.min, `At least ${LIMITS.password.min} characters`),
    ],
    confirmPassword: [
      rule.required('Confirm your password'),
      rule.matchesField('password', 'The two passwords do not match'),
    ],
  },

  login: {
    email: [rule.required('Enter your email'), rule.email()],
    password: [rule.required('Enter your password')],
  },

  verify: {
    code: [rule.required('Enter the code'), rule.match(/^\d{6}$/, 'The code is six digits')],
  },

  post: {
    body: [
      rule.required('Write something first'),
      rule.minLength(LIMITS.postBody.min, 'A little more than that'),
      rule.maxLength(LIMITS.postBody.max, `At most ${LIMITS.postBody.max} characters`),
    ],
  },

  comment: {
    body: [
      rule.required('Write something first'),
      rule.minLength(LIMITS.commentBody.min, 'A little more than that'),
      rule.maxLength(LIMITS.commentBody.max, `At most ${LIMITS.commentBody.max} characters`),
    ],
  },

  community: {
    name: [
      rule.required('Give the community a name'),
      rule.minLength(LIMITS.communityName.min, `At least ${LIMITS.communityName.min} characters`),
      rule.maxLength(LIMITS.communityName.max, `At most ${LIMITS.communityName.max} characters`),
    ],
    description: [rule.maxLength(LIMITS.communityDescription.max, 'At most 280 characters')],
    type: [rule.oneOf(['driver', 'team', 'general'], 'Pick driver, team or general')],
  },

  meetup: {
    title: [
      rule.required('Give the meetup a title'),
      rule.minLength(LIMITS.meetupTitle.min, 'At least 4 characters'),
      rule.maxLength(LIMITS.meetupTitle.max, 'At most 80 characters'),
    ],
    location: [
      rule.required('Where is it? A place, or a link for online'),
      rule.maxLength(LIMITS.meetupLocation.max, 'At most 120 characters'),
    ],
    description: [rule.maxLength(LIMITS.meetupDescription.max, 'At most 400 characters')],
    startsAt: [rule.required('When does it start?'), rule.futureDate()],
    capacity: [rule.integer({ min: 2, max: 500 }, 'Between 2 and 500')],
  },

  profile: {
    displayName: [rule.maxLength(LIMITS.displayName.max, 'At most 40 characters')],
    bio: [rule.maxLength(LIMITS.bio.max, 'At most 200 characters')],
  },

  report: {
    reason: [
      rule.required('Say why you are reporting this'),
      rule.minLength(LIMITS.reportReason.min, 'A little more detail, please'),
      rule.maxLength(LIMITS.reportReason.max, 'At most 300 characters'),
    ],
  },

  prediction: {
    podium: [
      rule.required('Pick your podium'),
      rule.array({ min: 3, max: 3, unique: true }, 'Pick three different drivers'),
    ],
  },
}

/* ------------------------------------------------------------------ */
/*  Kept for the existing auth forms, now built on the shared rules    */
/* ------------------------------------------------------------------ */

export function validateRegister(values) {
  return validateForm(schemas.register, values).errors
}

export function validateLogin(values) {
  return validateForm(schemas.login, values).errors
}
