import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { authenticate } from './middleware/authenticate'

import authRouter from './modules/auth/auth.router'
import usersRouter from './modules/users/users.router'
import librariesRouter from './modules/libraries/libraries.router'
import shelvesRouter from './modules/shelves/shelves.router'
import booksRouter from './modules/books/books.router'
import bookCopiesRouter from './modules/bookCopies/bookCopies.router'
import loansRouter from './modules/loans/loans.router'
import reservationsRouter from './modules/reservations/reservations.router'
import permissionsRouter from './modules/permissions/permissions.router'
import groupsRouter from './modules/groups/groups.router'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.CORS_ORIGIN }))
  app.use(express.json())

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

  app.use('/api/auth', authRouter)
  app.use('/api/users', authenticate, usersRouter)
  app.use('/api/libraries', librariesRouter)
  app.use('/api/shelves', shelvesRouter)
  app.use('/api/books', booksRouter)
  app.use('/api/copies', bookCopiesRouter)
  app.use('/api/loans', authenticate, loansRouter)
  app.use('/api/reservations', authenticate, reservationsRouter)
  app.use('/api/permissions', permissionsRouter)
  app.use('/api/groups', groupsRouter)

  app.use(errorHandler)

  return app
}
