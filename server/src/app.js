/**
 *  F1Paddock API : Phase 2
 */

import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/authRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import communityRoutes from './routes/communityRoutes.js'
import postRoutes from './routes/postRoutes.js'
import commentRoutes from './routes/commentRoutes.js'
import meetupRoutes from './routes/meetupRoutes.js'
import predictionRoutes from './routes/predictionRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import aiRoutes from './routes/aiRoutes.js'

import { issueCsrfToken, requireCsrfToken } from './middleware/csrf.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'
import { mailMode } from './lib/mailer.js'
import { aiProvider } from './ai/provider.js'

const app = express()

const PORT = Number(process.env.PORT || 4000)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
app.use(
  helmet({
    hsts: IS_PRODUCTION ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    // The API serves JSON, not pages, so a strict default policy is free.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  }),
)

if (IS_PRODUCTION) {
  app.set('trust proxy', 1)

  app.use((req, res, next) => {
    if (req.secure) return next()
    res.redirect(301, `https://${req.headers.host}${req.originalUrl}`)
  })
}
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  }),
)

app.use(cookieParser())

app.use(express.json({ limit: '100kb' }))

app.use((req, res, next) => {
  if (req.path === '/api/health') return next()

  const startedAt = process.hrtime.bigint()

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6
    const mark = res.statusCode >= 500 ? '!!' : res.statusCode >= 400 ? ' *' : '  '
    console.log(`${mark} ${req.method} ${req.path} -> ${res.statusCode} in ${ms.toFixed(0)}ms`)
  })

  next()
})


app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mailMode,
    aiProvider,
    uptimeSeconds: Math.round(process.uptime()),
  })
})

// The client calls this once on boot to get a token for its write requests.
app.get('/api/csrf-token', issueCsrfToken)

app.use('/api', requireCsrfToken)



app.use('/api/auth', authRoutes)
app.use('/api/profiles', profileRoutes)
app.use('/api/communities', communityRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/meetups', meetupRoutes)
app.use('/api/predictions', predictionRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/ai', aiRoutes)

// Nothing matched


app.use(notFound)
app.use(errorHandler)

export default app