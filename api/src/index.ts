import 'dotenv/config'
import './config/env' // Validate env vars at startup
import cron from 'node-cron'
import { createApp } from './app'
import { env } from './config/env'
import { prisma } from './lib/prisma'
import { createBackup, pruneOldBackups } from './modules/backups/backups.service'

async function main() {
  const app = createApp()

  await prisma.$connect()
  console.log('Database connected')

  // Daily backup at 02:00 AM
  cron.schedule('0 2 * * *', () => {
    try {
      const backup = createBackup('scheduled', 'Daily automatic backup')
      console.log(`[Backup] Daily backup created: ${backup.filename} (${(backup.size / 1024).toFixed(1)} KB)`)
      const pruned = pruneOldBackups()
      if (pruned > 0) console.log(`[Backup] Pruned ${pruned} old backup(s)`)
    } catch (err) {
      console.error('[Backup] Daily backup failed:', err)
    }
  })

  app.listen(env.PORT, () => {
    console.log(`Library Portal API running on port ${env.PORT} [${env.NODE_ENV}]`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
