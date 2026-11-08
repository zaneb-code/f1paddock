/**
 * F1Paddock API server (Phase 1).
 *
 * Deliberately small. It exists for the two things a React app genuinely
 * cannot do on its own:
 *
 *   1. Issue and verify JWTs, and email a verification code — both need a
 *      secret that must never reach the browser.
 *   2. Call an LLM — same reason: the API key has to stay server-side.
 *
 * Everything else in Phase 1 (posts, communities, meetups, predictions) runs
 * in the client against a mock data layer, which Phase 2 replaces with real
 * routes here backed by MongoDB.
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.js'
import aiRoutes from './routes/ai.js'
import { mailMode } from './lib/mailer.js'
import { aiProvider } from './ai/provider.js'
import { debugSnapshot } from './lib/store.js'

const app = express()
const PORT = Number(process.env.PORT || 4000)

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }))
app.use(express.json())

// One line per request, so you can see what the client is doing.
app.use((req, _res, next) => {
  if (req.path !== '/api/health') console.log(`  ${req.method} ${req.path}`)
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mailMode, aiProvider, uptimeSeconds: Math.round(process.uptime()) })
})

app.use('/api/auth', authRoutes)
app.use('/api/ai', aiRoutes)

/**
 * Development helper: shows the users and pending codes held in memory.
 * Useful when MAIL_MODE=console and you want to grab a code quickly.
 * Refuses to run in production.
 */
app.get('/api/_debug/state', (_req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' })
  res.json(debugSnapshot())
})

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` })
})

// Express 5 forwards async errors here automatically.
app.use((error, _req, res, _next) => {
  console.error('[server] unhandled:', error)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

app.listen(PORT, () => {
  console.log(`\n  F1Paddock API  http://localhost:${PORT}`)
  console.log(`  mail mode:     ${mailMode}`)
  console.log(`  ai provider:   ${aiProvider}\n`)
})
