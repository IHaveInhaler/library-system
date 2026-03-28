import express from 'express'
import path from 'path'
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
import auditRouter from './modules/audit/audit.router'
import settingsRouter from './modules/settings/settings.router'
import { getPublicSettings } from './modules/settings/settings.controller'
import uploadRoutes from './lib/uploadRoutes'
import membershipTypesRouter from './modules/membershipTypes/membershipTypes.router'
import categoriesRouter from './modules/categories/categories.router'
import bookNotesRouter from './modules/bookNotes/bookNotes.router'
import twoFactorRouter from './modules/twoFactor/twoFactor.router'
import setupRouter from './modules/setup/setup.router'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.CORS_ORIGIN }))
  app.use(express.json())

  // Serve uploaded files
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')
  app.use('/uploads', express.static(uploadDir))

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
  app.use('/api/categories', categoriesRouter)
  app.use('/api/membership-types', membershipTypesRouter)
  app.use('/api/books', authenticate, bookNotesRouter) // book notes routes (nested under /books/:bookId/notes)
  app.use('/api/audit', authenticate, auditRouter)
  app.get('/api/settings/public', getPublicSettings)
  app.use('/api/settings', authenticate, settingsRouter)
  app.use('/api', uploadRoutes)
  app.use('/api/auth/2fa', twoFactorRouter)
  app.use('/api/setup', setupRouter)

  app.use(errorHandler)

  return app
}
