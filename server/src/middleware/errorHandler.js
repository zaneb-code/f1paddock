/**
 * The last two middleware in the chain: 404, then the error handler.
 */

export function notFound(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` })
}

export function errorHandler(error, req, res, _next) {
  if (error.name === 'ValidationError') {
    const fields = {}
    for (const [path, detail] of Object.entries(error.errors)) {
      fields[path] = detail.message
    }

    return res.status(400).json({ error: 'Please fix the highlighted fields.', fields })
  }

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

  if (error.name === 'CastError') {
    return res.status(400).json({ error: `'${error.value}' is not a valid ${error.path}.` })
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'The request body is not valid JSON.' })
  }

  if (error.status || error.statusCode) {
    return res.status(error.status ?? error.statusCode).json({ error: error.message })
  }

  console.error('[server] unhandled:', error)

  res.status(500).json({
    error: 'Something went wrong on the server.',
    ...(process.env.NODE_ENV === 'production' ? {} : { detail: error.message }),
  })
}

export function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}