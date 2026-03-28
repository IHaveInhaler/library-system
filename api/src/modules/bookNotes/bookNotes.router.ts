import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'

const router = Router()

// All routes require authentication (applied at app.ts level)

// Get my note for a book
router.get('/:bookId/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const note = await prisma.bookNote.findUnique({
      where: { userId_bookId: { userId: req.user!.id, bookId: req.params.bookId as string } },
    })
    res.json(note)
  } catch (err) { next(err) }
})

// Create or update my note for a book
router.put('/:bookId/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { encryptedContent, iv } = req.body
    const note = await prisma.bookNote.upsert({
      where: { userId_bookId: { userId: req.user!.id, bookId: req.params.bookId as string } },
      create: { userId: req.user!.id, bookId: req.params.bookId as string, encryptedContent, iv },
      update: { encryptedContent, iv },
    })
    res.json(note)
  } catch (err) { next(err) }
})

// Delete my note for a book
router.delete('/:bookId/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.bookNote.deleteMany({
      where: { userId: req.user!.id, bookId: req.params.bookId as string },
    })
    res.status(204).end()
  } catch (err) { next(err) }
})

export default router
