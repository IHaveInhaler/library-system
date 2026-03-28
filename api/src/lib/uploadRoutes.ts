import { Router, Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'
import rateLimit from 'express-rate-limit'
import { prisma } from './prisma'
import { upload, deleteFile, getUploadUrl, validateMagicBytes, addExtension, UPLOAD_DIR } from './upload'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'
import { authorizePermission } from '../middleware/authorizePermission'
import { NotFoundError, ForbiddenError, BadRequestError } from '../errors'
import { hasPermission } from './permissions'
import { logAction } from './audit'

// Rate limit non-orphan file deletions: 10 per 15 minutes
const fileDeletionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { code: 'RATE_LIMITED', message: 'Too many file deletions, please try again later' },
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
})

const router = Router()

/**
 * Post-upload security validation:
 * 1. Check file exists
 * 2. Validate magic bytes match claimed MIME
 * 3. Add correct extension
 */
async function secureFile(req: Request): Promise<string> {
  if (!req.file) throw new BadRequestError('No file uploaded')

  const filepath = path.join(UPLOAD_DIR, req.file.filename)
  const valid = await validateMagicBytes(filepath, req.file.mimetype)
  if (!valid) throw new BadRequestError('File content does not match its type — upload rejected')

  const filename = addExtension(filepath, req.file.mimetype)
  return filename
}

// ── User avatar ─────────────────────────────────────────────────────────────

router.post(
  '/users/:id/avatar',
  authenticate,
  upload.single('avatar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const isSelf = req.user!.id === id
      if (!isSelf) {
        const canManage = await hasPermission(req.user!.role, 'MANAGE_USERS')
        if (!canManage) throw new ForbiddenError()
      }

      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) throw new NotFoundError('User')

      const filename = await secureFile(req)

      // Delete old avatar
      if (user.avatarUrl) {
        const oldFile = user.avatarUrl.split('/').pop()
        if (oldFile) deleteFile(oldFile)
      }

      const avatarUrl = getUploadUrl(filename)
      const updated = await prisma.user.update({
        where: { id },
        data: { avatarUrl },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, isActive: true, createdAt: true, updatedAt: true },
      })
      res.json(updated)
    } catch (err) { next(err) }
  }
)

router.delete(
  '/users/:id/avatar',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const isSelf = req.user!.id === id
      if (!isSelf) {
        const canManage = await hasPermission(req.user!.role, 'MANAGE_USERS')
        if (!canManage) throw new ForbiddenError()
      }

      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) throw new NotFoundError('User')

      if (user.avatarUrl) {
        const oldFile = user.avatarUrl.split('/').pop()
        if (oldFile) deleteFile(oldFile)
      }

      await prisma.user.update({ where: { id }, data: { avatarUrl: null } })
      res.status(204).end()
    } catch (err) { next(err) }
  }
)

// ── Library image ───────────────────────────────────────────────────────────

router.post(
  '/libraries/:id/image',
  authenticate,
  authorizePermission('MANAGE_LIBRARY_IMAGE'),
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const library = await prisma.library.findUnique({ where: { id } })
      if (!library) throw new NotFoundError('Library')

      const filename = await secureFile(req)

      if (library.imageUrl) {
        const oldFile = library.imageUrl.split('/').pop()
        if (oldFile) deleteFile(oldFile)
      }

      const imageUrl = getUploadUrl(filename)
      const updated = await prisma.library.update({ where: { id }, data: { imageUrl } })
      res.json(updated)
    } catch (err) { next(err) }
  }
)

router.delete(
  '/libraries/:id/image',
  authenticate,
  authorizePermission('MANAGE_LIBRARY_IMAGE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const library = await prisma.library.findUnique({ where: { id } })
      if (!library) throw new NotFoundError('Library')

      if (library.imageUrl) {
        const oldFile = library.imageUrl.split('/').pop()
        if (oldFile) deleteFile(oldFile)
      }

      await prisma.library.update({ where: { id }, data: { imageUrl: null } })
      res.status(204).end()
    } catch (err) { next(err) }
  }
)

// ── Book cover ──────────────────────────────────────────────────────────────

router.post(
  '/books/:id/cover',
  authenticate,
  authorizePermission('MANAGE_BOOKS'),
  upload.single('cover'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const book = await prisma.book.findUnique({ where: { id } })
      if (!book) throw new NotFoundError('Book')

      const filename = await secureFile(req)

      // Delete old cover if it's a local upload
      if (book.coverUrl?.startsWith('/uploads/')) {
        const oldFile = book.coverUrl.split('/').pop()
        if (oldFile) deleteFile(oldFile)
      }

      const coverUrl = getUploadUrl(filename)
      const updated = await prisma.book.update({ where: { id }, data: { coverUrl } })
      res.json(updated)
    } catch (err) { next(err) }
  }
)

router.delete(
  '/books/:id/cover',
  authenticate,
  authorizePermission('MANAGE_BOOKS'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const book = await prisma.book.findUnique({ where: { id } })
      if (!book) throw new NotFoundError('Book')

      if (book.coverUrl?.startsWith('/uploads/')) {
        const oldFile = book.coverUrl.split('/').pop()
        if (oldFile) deleteFile(oldFile)
      }

      await prisma.book.update({ where: { id }, data: { coverUrl: null } })
      res.status(204).end()
    } catch (err) { next(err) }
  }
)

// ── Admin: List all files ──────────────────────────────────────────────────

interface FileEntry {
  id: string
  filename: string
  url: string
  type: 'avatar' | 'library-image' | 'book-cover' | 'orphan'
  size: number
  owner: { id: string; name: string } | null
  entity: { id: string; name: string } | null
  createdAt: string | null
}

router.get(
  '/files',
  authenticate,
  authorize('ADMIN'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const files: FileEntry[] = []

      // Get all users with avatars
      const usersWithAvatars = await prisma.user.findMany({
        where: { avatarUrl: { not: null } },
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, createdAt: true },
      })
      for (const u of usersWithAvatars) {
        if (!u.avatarUrl) continue
        const filename = path.basename(u.avatarUrl)
        const filepath = path.join(UPLOAD_DIR, filename)
        const size = fs.existsSync(filepath) ? fs.statSync(filepath).size : 0
        files.push({
          id: `avatar:${u.id}`,
          filename,
          url: u.avatarUrl,
          type: 'avatar',
          size,
          owner: { id: u.id, name: `${u.firstName} ${u.lastName}` },
          entity: { id: u.id, name: u.email },
          createdAt: u.createdAt.toISOString(),
        })
      }

      // Get all libraries with images
      const librariesWithImages = await prisma.library.findMany({
        where: { imageUrl: { not: null } },
        select: { id: true, name: true, imageUrl: true, createdAt: true },
      })
      for (const l of librariesWithImages) {
        if (!l.imageUrl) continue
        const filename = path.basename(l.imageUrl)
        const filepath = path.join(UPLOAD_DIR, filename)
        const size = fs.existsSync(filepath) ? fs.statSync(filepath).size : 0
        files.push({
          id: `library:${l.id}`,
          filename,
          url: l.imageUrl,
          type: 'library-image',
          size,
          owner: null,
          entity: { id: l.id, name: l.name },
          createdAt: l.createdAt.toISOString(),
        })
      }

      // Get all books with local covers
      const booksWithCovers = await prisma.book.findMany({
        where: { coverUrl: { startsWith: '/uploads/' } },
        select: { id: true, title: true, author: true, coverUrl: true, createdAt: true },
      })
      for (const b of booksWithCovers) {
        if (!b.coverUrl) continue
        const filename = path.basename(b.coverUrl)
        const filepath = path.join(UPLOAD_DIR, filename)
        const size = fs.existsSync(filepath) ? fs.statSync(filepath).size : 0
        files.push({
          id: `book:${b.id}`,
          filename,
          url: b.coverUrl,
          type: 'book-cover',
          size,
          owner: null,
          entity: { id: b.id, name: `${b.title} — ${b.author}` },
          createdAt: b.createdAt.toISOString(),
        })
      }

      // Find orphan files (on disk but not referenced by any entity)
      const referencedFiles = new Set(files.map((f) => f.filename))
      if (fs.existsSync(UPLOAD_DIR)) {
        for (const f of fs.readdirSync(UPLOAD_DIR)) {
          if (referencedFiles.has(f)) continue
          const filepath = path.join(UPLOAD_DIR, f)
          const stat = fs.statSync(filepath)
          if (!stat.isFile()) continue
          files.push({
            id: `orphan:${f}`,
            filename: f,
            url: `/uploads/${f}`,
            type: 'orphan',
            size: stat.size,
            owner: null,
            entity: null,
            createdAt: stat.mtime.toISOString(),
          })
        }
      }

      // Sort newest first
      files.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

      res.json({ files, totalSize: files.reduce((s, f) => s + f.size, 0) })
    } catch (err) { next(err) }
  }
)

// ── Admin: Delete a file ──────────────────────────────────────────────────

router.delete(
  '/files/orphans',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Collect all referenced filenames
      const [users, libraries, books] = await Promise.all([
        prisma.user.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } }),
        prisma.library.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
        prisma.book.findMany({ where: { coverUrl: { startsWith: '/uploads/' } }, select: { coverUrl: true } }),
      ])
      const referenced = new Set([
        ...users.map((u) => path.basename(u.avatarUrl!)),
        ...libraries.map((l) => path.basename(l.imageUrl!)),
        ...books.map((b) => path.basename(b.coverUrl!)),
      ])

      let deleted = 0
      if (fs.existsSync(UPLOAD_DIR)) {
        for (const f of fs.readdirSync(UPLOAD_DIR)) {
          if (referenced.has(f)) continue
          const filepath = path.join(UPLOAD_DIR, f)
          if (!fs.statSync(filepath).isFile()) continue
          deleteFile(f)
          deleted++
        }
      }

      logAction({ actorId: req.user!.id, actorName: req.user!.email, action: 'ORPHAN_FILES_DELETED', targetType: 'File', metadata: { count: deleted } })
      res.json({ message: `Deleted ${deleted} orphan file${deleted !== 1 ? 's' : ''}` })
    } catch (err) { next(err) }
  }
)

router.delete(
  '/files/:fileId',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fileId = req.params.fileId as string
      const [type, ...rest] = fileId.split(':')
      const id = rest.join(':')

      // Rate limit non-orphan deletions
      if (type !== 'orphan') {
        await new Promise<void>((resolve, reject) => {
          fileDeletionLimiter(req, res, (err: any) => err ? reject(err) : resolve())
        })
        // If rate limiter sent a response, stop
        if (res.headersSent) return
      }

      if (type === 'avatar') {
        const user = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true, email: true } })
        if (!user?.avatarUrl) throw new NotFoundError('File')
        const filename = path.basename(user.avatarUrl)
        deleteFile(filename)
        await prisma.user.update({ where: { id }, data: { avatarUrl: null } })
        logAction({ actorId: req.user!.id, actorName: req.user!.email, action: 'FILE_DELETED', targetType: 'User', targetId: id, targetName: user.email, metadata: { filename, type: 'avatar' } })
      } else if (type === 'library') {
        const library = await prisma.library.findUnique({ where: { id }, select: { imageUrl: true, name: true } })
        if (!library?.imageUrl) throw new NotFoundError('File')
        const filename = path.basename(library.imageUrl)
        deleteFile(filename)
        await prisma.library.update({ where: { id }, data: { imageUrl: null } })
        logAction({ actorId: req.user!.id, actorName: req.user!.email, action: 'FILE_DELETED', targetType: 'Library', targetId: id, targetName: library.name, metadata: { filename, type: 'library-image' } })
      } else if (type === 'book') {
        const book = await prisma.book.findUnique({ where: { id }, select: { coverUrl: true, title: true } })
        if (!book?.coverUrl) throw new NotFoundError('File')
        const filename = path.basename(book.coverUrl)
        deleteFile(filename)
        await prisma.book.update({ where: { id }, data: { coverUrl: null } })
        logAction({ actorId: req.user!.id, actorName: req.user!.email, action: 'FILE_DELETED', targetType: 'Book', targetId: id, targetName: book.title, metadata: { filename, type: 'book-cover' } })
      } else if (type === 'orphan') {
        deleteFile(id)
        logAction({ actorId: req.user!.id, actorName: req.user!.email, action: 'FILE_DELETED', targetType: 'File', targetName: id, metadata: { type: 'orphan' } })
      } else {
        throw new BadRequestError('Invalid file ID format')
      }

      res.json({ message: 'File deleted' })
    } catch (err) { next(err) }
  }
)

export default router
