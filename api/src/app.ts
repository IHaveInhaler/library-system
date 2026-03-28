import express from 'express'
import path from 'path'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
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

  // Trust proxy headers when behind a reverse proxy (nginx, Cloudflare, etc.)
  // This can also be set via the TRUST_PROXY env var
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', true)
  }

  // Security headers — removes X-Powered-By, adds X-Content-Type-Options, etc.
  app.use(helmet({
    contentSecurityPolicy: false, // CSP managed by frontend
    crossOriginEmbedderPolicy: false, // Allow image loading from uploads
  }))

  // CORS — validate origin isn't wildcard in production
  const corsOrigin = env.CORS_ORIGIN
  if (env.NODE_ENV === 'production' && corsOrigin === '*') {
    console.warn('WARNING: CORS_ORIGIN is set to wildcard (*) in production. This is insecure.')
  }
  app.use(cors({ origin: corsOrigin }))

  // Body size limits to prevent DoS
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))

  // Global rate limit — 100 requests per minute per IP
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  }))

  // Serve uploaded files
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')
  app.use('/uploads', express.static(uploadDir))

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

  // Strict rate limits on auth endpoints — 10 attempts per 15 minutes per IP
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { code: 'RATE_LIMITED', message: 'Too many authentication attempts, please try again later' },
  })
  app.use('/api/auth/login', authLimiter)
  app.use('/api/auth/register', authLimiter)
  app.use('/api/auth/forgot-password', authLimiter)
  app.use('/api/auth/verify-email', authLimiter)
  app.use('/api/auth/2fa/challenge', authLimiter)

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
  // Rate limit setup code verification — 5 attempts per 15 minutes
  app.use('/api/setup/verify-code', rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { code: 'RATE_LIMITED', message: 'Too many attempts' } }))
  app.use('/api/setup', setupRouter)

  app.use(errorHandler)

  return app
}
