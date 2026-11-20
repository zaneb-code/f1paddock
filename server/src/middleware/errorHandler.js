/**
 * The last two middleware in the chain: 404, then the error handler.
 *
 * Express tells these apart by arity. A function with four arguments is an
 * error handler; remove `error` and it silently becomes ordinary middleware
 * that never runs. That is a genuinely easy mistake to make.
 *
 * Its main job is translating Mongoose's error shapes into the same
 * `{ error, fields }` envelope the route validators use, so the React forms
 * have one thing to read whether a value was rejected at level 2 or level 3.
 */

/** No route matched. */
export function notFound(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` })
}

export function errorHandler(error, req, res, _next) {
  // ---- Mongoose: a document failed its schema rules (validation level 3) ----
  if (error.name === 'ValidationError') {
    const fields = {}
    for (const [path, detail] of Object.entries(error.errors)) {
      fields[path] = detail.message
    }

    return res.status(400).json({ error: 'Please fix the highlighted fields.', fields })
  }

  // ---- MongoDB: a unique index was violated ----
  // 409 rather than 400: nothing is wrong with the request, it just clashes
  // with something already stored.
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? 'value'
    const readable = {
      email: 'That email is already registered',
      username: 'That username is taken',
    }

    return res.status(409).json({
      error: readable[field] ?? `That ${field} is already in use`,
      fields: { [field]: readable[field] ?? 'Already in use' },
    })
  }

  // ---- Mongoose: an id that is not a valid ObjectId reached a query ----
  if (error.name === 'CastError') {
    return res.status(400).json({ error: `'${error.value}' is not a valid ${error.path}.` })
  }

  // ---- express.json() could not parse the body ----
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'The request body is not valid JSON.' })
  }

  // ---- Anything a controller threw deliberately ----
  if (error.status || error.statusCode) {
    return res.status(error.status ?? error.statusCode).json({ error: error.message })
  }

  // ---- Genuinely unexpected ----
  // Log the detail for us; tell the client almost nothing. Stack traces and
  // internal messages are a reconnaissance gift to an attacker.
  console.error('[server] unhandled:', error)

  res.status(500).json({
    error: 'Something went wrong on the server.',
    ...(process.env.NODE_ENV === 'production' ? {} : { detail: error.message }),
  })
}

/**
 * A small helper for throwing errors with a status from a controller:
 *
 *   if (!post) throw httpError(404, 'That post no longer exists.')
 */
export function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}
