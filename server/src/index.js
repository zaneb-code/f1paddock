/**
 * Server start-up.
 *
 * app.js builds the Express app; this file connects to MongoDB and listens.
 * Splitting them means a test can import the app without starting a server.
 */

import 'dotenv/config'

import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'

import app from './app.js'
import { connectDB } from './config/db.js'
import { mailMode } from './lib/mailer.js'
import { aiProvider } from './ai/provider.js'

const PORT = Number(process.env.PORT || 4000)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

/**
 * Local HTTPS, if a key and certificate are configured.
 *
 * In production the usual arrangement is the one from the lecture — nginx
 * holds the certificate and forwards plain HTTP to this app on localhost, so
 * Node never sees a key at all. This branch exists for trying HTTPS on your
 * own machine with a self-signed certificate; the README has the one openssl
 * command that makes one.
 */
function createServer() {
  const keyPath = process.env.SSL_KEY_PATH
  const certPath = process.env.SSL_CERT_PATH

  if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const credentials = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
    return { server: https.createServer(credentials, app), scheme: 'https' }
  }

  return { server: http.createServer(app), scheme: 'http' }
}

async function start() {
  try {
    await connectDB()
  } catch (error) {
    // A server that is up but cannot reach its database answers every request
    // with a 500 and looks like a bug in the code. Better to stop and say so.
    console.error('\n  Could not connect to MongoDB.')
    console.error(`  ${error.message}\n`)
    console.error('  Is mongod running? Check MONGO_URI in server/.env.')
    console.error('  The README has setup instructions for local MongoDB and Atlas.\n')
    process.exit(1)
  }

  const { server, scheme } = createServer()

  server.listen(PORT, () => {
    console.log(`\n  F1Paddock API  ${scheme}://localhost:${PORT}`)
    console.log(`  client origin: ${CLIENT_ORIGIN}`)
    console.log(`  mail mode:     ${mailMode}`)
    console.log(`  ai provider:   ${aiProvider}\n`)
  })
}

start()
