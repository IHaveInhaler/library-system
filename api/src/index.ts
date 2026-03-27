import 'dotenv/config'
import './config/env' // Validate env vars at startup
import { createApp } from './app'
import { env } from './config/env'
import { prisma } from './lib/prisma'

async function main() {
  const app = createApp()

  await prisma.$connect()
  console.log('Database connected')

  app.listen(env.PORT, () => {
    console.log(`Library Portal API running on port ${env.PORT} [${env.NODE_ENV}]`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
