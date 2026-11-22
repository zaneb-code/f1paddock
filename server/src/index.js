/**
 * Server start-up.
 *
 * app.js builds the Express app; this file connects to MongoDB and listens.
 */

import 'dotenv/config'

import http from 'node:http'

import app from './app.js'
import { connectDB } from './config/db.js'
import { mailMode } from './lib/mailer.js'
import { aiProvider } from './ai/provider.js'

const PORT = Number(process.env.PORT || 4000)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

async function start() {
  try {
    await connectDB()
  } catch (error) {
    console.error('\n  Could not connect to MongoDB.')
    console.error(`  ${error.message}\n`)
    console.error('  Is mongod running? Check MONGO_URI in server/.env.')
    console.error('  The README has setup instructions for local MongoDB and Atlas.\n')
    process.exit(1)
  }

  // Plain HTTP. In deployment a reverse proxy such as nginx holds the
  // certificate and forwards to this app over the loopback interface.
  const server = http.createServer(app)

  server.listen(PORT, () => {
    console.log(`\n  F1Paddock API  http://localhost:${PORT}`)
    console.log(`  client origin: ${CLIENT_ORIGIN}`)
    console.log(`  mail mode:     ${mailMode}`)
    console.log(`  ai provider:   ${aiProvider}\n`)
  })
}

start()