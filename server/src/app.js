/**
 * ============================================================================
 *  F1Paddock API — Phase 2
 * ============================================================================
 *
 * Phase 1 kept accounts in memory and ran the social features in the browser
 * against a localStorage stand-in. Phase 2 moves all of it here, behind
 * MongoDB, with validation and authorisation on the server where they cannot
 * be edited by whoever is using the site.
 *
 * THE MIDDLEWARE CHAIN, in the order a request meets it. Order is not
 * cosmetic here — several of these only work because of what runs before them:
 *
 *    1. helmet            security headers on every response
 *    2. cors              which origins may READ our responses
 *    3. cookieParser      fills req.cookies — auth and CSRF both need it
 *    4. express.json      fills req.body
 *    5. request log       one line per request
 *    6. requireCsrfToken  blocks forged state-changing requests
 *    7. the routes        each with its own auth → sanitise → validate chain
 *    8. notFound          no route matched
 *    9. errorHandler      the only place that formats an error
 *
 * This file builds the app and stops there. Starting it — connecting to
 * MongoDB and listening on a port — is index.js. Keeping them apart means
 * the tests can import the app and drive it without a real server or a
 * real database behind it.
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

/* ------------------------------------------------------------------ */
/*  1. Security headers                                                */
/* ------------------------------------------------------------------ */

/**
 * helmet sets a dozen response headers that turn browser protections on.
 * The two worth knowing by name:
 *
 *   Content-Security-Policy  tells the browser which sources may run script.
 *                            It is the backstop for XSS: even if something
 *                            injected gets through, the browser refuses to
 *                            execute script from anywhere unexpected.
 *
 *   Strict-Transport-Security (HSTS) tells the browser "only ever reach this
 *                            site over HTTPS, for the next N days". It closes
 *                            the gap where a user types http:// and is
 *                            downgraded before the redirect can happen.
 *
 * HSTS is only sent in production. Switching it on from localhost would
 * teach your browser to force HTTPS on localhost, which then breaks every
 * other project you run there — and it is remembered for months.
 */
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

/**
 * Behind a reverse proxy (nginx terminating TLS, as in the HTTPS lecture)
 * Express needs telling, or req.protocol always reads 'http' and the
 * redirect below becomes an infinite loop.
 */
if (IS_PRODUCTION) {
  app.set('trust proxy', 1)

  app.use((req, res, next) => {
    if (req.secure) return next()
    res.redirect(301, `https://${req.headers.host}${req.originalUrl}`)
  })
}

/* ------------------------------------------------------------------ */
/*  2. CORS                                                            */
/* ------------------------------------------------------------------ */

/**
 * The client runs on :5173 and this API on :4000. Different port means
 * different origin, so without CORS the browser sends every request and then
 * refuses to let our own JavaScript read the reply.
 *
 * Two deliberate choices:
 *
 *   origin: one specific address, never '*'. A wildcard says "any website
 *           may read my responses in its visitor's browser", which is the
 *           exact protection the Same-Origin Policy exists to provide.
 *
 *   credentials: true — required for the session cookie to be sent at all on
 *           a cross-origin request. It is also why '*' is not an option:
 *           browsers refuse to combine a wildcard origin with credentials.
 *
 * Worth being clear-eyed about what this does NOT do. CORS protects the
 * user's browser, not this server. curl and Postman ignore it entirely, which
 * is why every route below still authenticates and validates for itself.
 */
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  }),
)

/* ------------------------------------------------------------------ */
/*  3-4. Parsers                                                       */
/* ------------------------------------------------------------------ */

app.use(cookieParser())

// A size limit, because the default is generous and a 10MB JSON body is
// never a legitimate post on this site.
app.use(express.json({ limit: '100kb' }))

/* ------------------------------------------------------------------ */
/*  5. Request log                                                     */
/* ------------------------------------------------------------------ */

/**
 * Logs each request when it FINISHES, with its status and how long it took.
 *
 * Logging on arrival instead is a trap: the line appears either way, so a
 * request that hangs looks exactly like one that succeeded, and the log
 * cannot tell you which. `res.on('finish')` fires once the response has been
 * handed to the socket, so a line with no status never appears at all — and
 * a missing line is then real evidence that something never answered.
 */
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

/* ------------------------------------------------------------------ */
/*  Public endpoints that sit outside the CSRF gate                    */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  6. CSRF gate                                                       */
/* ------------------------------------------------------------------ */

// Reads pass straight through; anything that changes state needs a token.
app.use('/api', requireCsrfToken)

/* ------------------------------------------------------------------ */
/*  7. Routes                                                          */
/* ------------------------------------------------------------------ */

app.use('/api/auth', authRoutes)
app.use('/api/profiles', profileRoutes)
app.use('/api/communities', communityRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/meetups', meetupRoutes)
app.use('/api/predictions', predictionRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/ai', aiRoutes)

/* ------------------------------------------------------------------ */
/*  8-9. Nothing matched, or something went wrong                      */
/* ------------------------------------------------------------------ */

app.use(notFound)
app.use(errorHandler)

export default app