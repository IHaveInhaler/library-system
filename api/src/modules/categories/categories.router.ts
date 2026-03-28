import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../middleware/authenticate'
import { authorizePermission } from '../../middleware/authorizePermission'
import { ConflictError, NotFoundError, BadRequestError } from '../../errors'

const router = Router()

// List — public (used in dropdowns)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await prisma.category.findMany({ orderBy: { order: 'asc' } }))
  } catch (err) { next(err) }
})

// Create
router.post('/', authenticate, authorizePermission('MANAGE_CATEGORIES'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, label, color } = req.body
    if (!name || !label) throw new BadRequestError('Name and label are required')
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new BadRequestError('Name must be uppercase letters, digits, underscores')
    const existing = await prisma.category.findUnique({ where: { name } })
    if (existing) throw new ConflictError(`Category "${name}" already exists`)
    const maxOrder = await prisma.category.aggregate({ _max: { order: true } })
    const cat = await prisma.category.create({
      data: { name, label, color: color || null, order: (maxOrder._max.order ?? 0) + 1 },
    })
    res.status(201).json(cat)
  } catch (err) { next(err) }
})

// Update
router.patch('/:id', authenticate, authorizePermission('MANAGE_CATEGORIES'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: req.params.id as string } })
    if (!cat) throw new NotFoundError('Category')
    const { label, color, name } = req.body
    // If renaming, update all books and shelves that reference the old name
    if (name && name !== cat.name) {
      await prisma.$transaction([
        prisma.book.updateMany({ where: { genre: cat.name }, data: { genre: name } }),
        prisma.shelf.updateMany({ where: { genre: cat.name }, data: { genre: name } }),
        prisma.category.update({ where: { id: cat.id }, data: { name, label: label ?? cat.label, color: color !== undefined ? color : cat.color } }),
      ])
      res.json(await prisma.category.findUnique({ where: { id: cat.id } }))
    } else {
      const updated = await prisma.category.update({
        where: { id: cat.id },
        data: { ...(label && { label }), ...(color !== undefined && { color: color || null }) },
      })
      res.json(updated)
    }
  } catch (err) { next(err) }
})

// Delete
router.delete('/:id', authenticate, authorizePermission('MANAGE_CATEGORIES'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: req.params.id as string } })
    if (!cat) throw new NotFoundError('Category')
    // Check if any books use this category
    const bookCount = await prisma.book.count({ where: { genre: cat.name } })
    if (bookCount > 0) throw new BadRequestError(`Cannot delete — ${bookCount} book(s) use this category. Reassign them first.`)
    const shelfCount = await prisma.shelf.count({ where: { genre: cat.name } })
    if (shelfCount > 0) throw new BadRequestError(`Cannot delete — ${shelfCount} shelf/shelves use this category. Reassign them first.`)
    await prisma.category.delete({ where: { id: cat.id } })
    res.status(204).end()
  } catch (err) { next(err) }
})

// Reorder
router.post('/reorder', authenticate, authorizePermission('MANAGE_CATEGORIES'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids)) throw new BadRequestError('ids array required')
    await Promise.all(ids.map((id: string, i: number) => prisma.category.update({ where: { id }, data: { order: i + 1 } })))
    res.json({ message: 'Reordered' })
  } catch (err) { next(err) }
})

export default router
