/**
 * MongoDB connection.
 *
 * One job, in one file, called once from index.js at startup — the layout
 * from the Node lectures. Nothing else in the app knows the connection
 * string exists.
 */

import mongoose from 'mongoose'

/**
 * Connects to MongoDB and returns the connection.
 *
 * Throws if it cannot connect. index.js catches that and exits, because a
 * server that is up but cannot reach its database is worse than one that is
 * plainly down: it answers every request with a 500 and looks like a bug in
 * the code rather than a missing database.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/f1paddock'

  // Fail fast rather than queueing writes for 30 seconds against a database
  // that is not there.
  mongoose.set('strictQuery', true)
  mongoose.set('bufferCommands', false)

  const connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  })

  const { host, port, name } = connection.connection
  console.log(`  mongodb:       connected to ${name} at ${host}:${port}`)

  mongoose.connection.on('error', (error) => {
    console.error('[mongodb] connection error:', error.message)
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('[mongodb] disconnected')
  })

  return connection
}

/** Closes the connection. Used by the tests and on shutdown. */
export async function disconnectDB() {
  await mongoose.connection.close()
}
