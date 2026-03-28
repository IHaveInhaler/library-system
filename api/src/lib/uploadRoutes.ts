import { Router, Request, Response, NextFunction } from 'express'
import path from 'path'
import { prisma } from './prisma'
import { upload, deleteFile, getUploadUrl, validateMagicBytes, addExtension, UPLOAD_DIR } from './upload'
import { authenticate } from '../middleware/authenticate'
import { authorizePermission } from '../middleware/authorizePermission'
import { NotFoundError, ForbiddenError, BadRequestError } from '../errors'
import { hasPermission } from './permissions'

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

export default router
