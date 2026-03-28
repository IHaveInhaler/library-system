import { Router, Request, Response, NextFunction } from 'express'
import bwipjs from 'bwip-js'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../middleware/authenticate'

const router = Router()

// ── Barcode Image Generation ────────────────────────────────────────────────

router.get('/shelf/:label', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: req.params.label as string,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: 'center',
    })
    res.set('Content-Type', 'image/png')
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(png)
  } catch (err) { next(err) }
})

router.get('/copy/:barcode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'datamatrix',
      text: req.params.barcode as string,
      scale: 4,
      paddingwidth: 2,
      paddingheight: 2,
    })
    res.set('Content-Type', 'image/png')
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(png)
  } catch (err) { next(err) }
})

// ── Universal Scan Lookup ───────────────────────────────────────────────────

router.get('/scan/:code', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.params.code as string

    // Check shelves first
    const shelf = await prisma.shelf.findUnique({
      where: { label: code },
      include: { library: { select: { id: true, name: true, labelPrefix: true } }, _count: { select: { bookCopies: true } } },
    })
    if (shelf) {
      res.json({ type: 'shelf', entity: shelf })
      return
    }

    // Check book copies
    const copy = await prisma.bookCopy.findUnique({
      where: { barcode: code },
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true } },
        shelf: { include: { library: { select: { id: true, name: true } } } },
        loans: { where: { status: 'ACTIVE' }, take: 1, include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    })
    if (copy) {
      const activeLoan = copy.loans[0] ?? null
      res.json({ type: 'copy', entity: { ...copy, loans: undefined, activeLoan } })
      return
    }

    res.json({ type: 'unknown', entity: null })
  } catch (err) { next(err) }
})

export default router
