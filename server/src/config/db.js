/**
 * MongoDB connection.
 */

import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/f1paddock'

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

export async function disconnectDB() {
  await mongoose.connection.close()
}
