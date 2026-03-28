import { Router, Request, Response, NextFunction } from 'express'
import net from 'net'
import bwipjs from 'bwip-js'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../../middleware/authenticate'
import { authorizePermission } from '../../middleware/authorizePermission'
import { getSetting } from '../../lib/settings'

const router = Router()

// ── Security Helpers ────────────────────────────────────────────────────────

function isInternalHost(host: string): boolean {
  return /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|localhost$|\[?::1\]?$)/i.test(host)
}

const printSchema = z.object({
  type: z.enum(['shelf', 'copy']),
  code: z.string().min(1).max(100),
  libraryId: z.string().uuid().optional(),
})

// ── Barcode Image Generation ────────────────────────────────────────────────

router.get('/shelf/:label', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if ((req.params.label as string).length > 100) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Label too long (max 100 characters)' })
      return
    }
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
    if ((req.params.barcode as string).length > 100) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Barcode too long (max 100 characters)' })
      return
    }
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

// ── Print Barcode ──────────────────────────────────────────────────────────

function generateZPL(type: 'shelf' | 'copy', code: string, labelWidth: number, labelHeight: number): string {
  // Sanitize code: strip ZPL command prefixes to prevent injection
  const safeCode = code.replace(/[\^~]/g, '')

  // ZPL coordinates in dots (203 dpi typical). Convert mm to dots: mm * 8
  const widthDots = Math.round(labelWidth * 8)
  const heightDots = Math.round(labelHeight * 8)
  const xCenter = Math.round(widthDots / 2)

  if (type === 'shelf') {
    // Code 128 linear barcode for shelf labels
    const barcodeX = Math.round(xCenter - 150)
    return [
      '^XA',
      `^LL${heightDots}`,
      `^PW${widthDots}`,
      `^FO${barcodeX},20^BCN,60,Y,N,N^FD${safeCode}^FS`,
      '^XZ',
    ].join('\n')
  } else {
    // DataMatrix 2D barcode for copy barcodes
    const barcodeX = Math.round(xCenter - 40)
    return [
      '^XA',
      `^LL${heightDots}`,
      `^PW${widthDots}`,
      `^FO${barcodeX},10^BXN,4,200^FD${safeCode}^FS`,
      `^FO10,100^A0N,18,18^FD${safeCode}^FS`,
      '^XZ',
    ].join('\n')
  }
}

function sendZPL(host: string, port: number, zpl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    socket.setTimeout(5000)
    socket.connect(port, host, () => {
      socket.write(zpl, () => {
        socket.end()
        resolve()
      })
    })
    socket.on('error', (err) => { socket.destroy(); reject(err) })
    socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')) })
  })
}

async function sendIPP(printerUrl: string, pngBuffer: Buffer, jobName: string): Promise<void> {
  // Validate URL scheme — only http(s) allowed
  const parsed = new URL(printerUrl)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https schemes are allowed for IPP')
  }
  if (isInternalHost(parsed.hostname)) {
    throw new Error('Printing to internal/private network addresses is not allowed')
  }

  // IPP uses HTTP POST with application/ipp content type
  // We send the PNG as a document in a simple print-job operation
  // Build IPP print-job request
  // Version 1.1, operation Print-Job (0x0002)

  // Helper to write IPP attribute
  const writeAttr = (tag: number, name: string, value: Buffer) => {
    const nameBuf = Buffer.from(name, 'utf-8')
    const buf = Buffer.alloc(1 + 2 + nameBuf.length + 2 + value.length)
    buf.writeUInt8(tag, 0)
    buf.writeUInt16BE(nameBuf.length, 1)
    nameBuf.copy(buf, 3)
    buf.writeUInt16BE(value.length, 3 + nameBuf.length)
    value.copy(buf, 5 + nameBuf.length)
    return buf
  }

  const writeString = (tag: number, name: string, value: string) =>
    writeAttr(tag, name, Buffer.from(value, 'utf-8'))

  const writeInt = (tag: number, name: string, value: number) => {
    const buf = Buffer.alloc(4)
    buf.writeInt32BE(value)
    return writeAttr(tag, name, buf)
  }

  // IPP header: version 1.1, Print-Job operation, request-id 1
  const header = Buffer.alloc(8)
  header.writeUInt8(1, 0) // major version
  header.writeUInt8(1, 1) // minor version
  header.writeUInt16BE(0x0002, 2) // Print-Job
  header.writeInt32BE(1, 4) // request-id

  // Operation attributes group (tag 0x01)
  const opGroup = Buffer.from([0x01])

  const charset = writeString(0x47, 'attributes-charset', 'utf-8')
  const language = writeString(0x48, 'attributes-natural-language', 'en')
  const printerUri = writeString(0x45, 'printer-uri', printerUrl)
  const docName = writeString(0x42, 'document-name', jobName)
  const docFormat = writeString(0x49, 'document-format', 'image/png')

  // Job attributes group (tag 0x02)
  const jobGroup = Buffer.from([0x02])
  const copies = writeInt(0x21, 'copies', 1)

  // End of attributes (tag 0x03)
  const endAttrs = Buffer.from([0x03])

  const ippBody = Buffer.concat([
    header, opGroup, charset, language, printerUri, docName, docFormat,
    jobGroup, copies, endAttrs, pngBuffer,
  ])

  const response = await fetch(printerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/ipp' },
    body: ippBody,
  })

  if (!response.ok) {
    throw new Error(`IPP request failed: ${response.status} ${response.statusText}`)
  }
}

// Resolve print config: library-specific overrides global settings
async function getPrintConfig(libraryId?: string) {
  let lib: any = null
  if (libraryId) {
    lib = await prisma.library.findUnique({ where: { id: libraryId }, select: {
      printMethod: true, printZplHost: true, printZplPort: true,
      printZplLabelWidth: true, printZplLabelHeight: true, printIppUrl: true,
    }})
  }

  return {
    method: lib?.printMethod || (await getSetting('print.method')) || 'browser',
    zplHost: lib?.printZplHost || (await getSetting('print.zpl.host')) || '',
    zplPort: parseInt(lib?.printZplPort || (await getSetting('print.zpl.port')) || '9100', 10),
    zplLabelWidth: parseInt(lib?.printZplLabelWidth || (await getSetting('print.zpl.labelWidth')) || '50', 10),
    zplLabelHeight: parseInt(lib?.printZplLabelHeight || (await getSetting('print.zpl.labelHeight')) || '25', 10),
    ippUrl: lib?.printIppUrl || (await getSetting('print.ipp.printerUrl')) || '',
  }
}

router.post('/print', authenticate, authorizePermission('MANAGE_COPIES'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = printSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.error.issues.map((i) => i.message).join(', ') })
      return
    }
    const { type, code, libraryId } = parsed.data

    const config = await getPrintConfig(libraryId)

    if (config.method === 'browser') {
      res.status(400).json({ code: 'BROWSER_PRINT', message: 'Printing is configured for browser — use the browser print dialog' })
      return
    }

    if (config.method === 'zpl') {
      if (!config.zplHost) {
        res.status(400).json({ code: 'CONFIG_ERROR', message: 'ZPL printer host not configured' })
        return
      }
      if (isInternalHost(config.zplHost)) {
        res.status(400).json({ code: 'CONFIG_ERROR', message: 'Printing to internal/private network addresses is not allowed' })
        return
      }

      const zpl = generateZPL(type, code, config.zplLabelWidth, config.zplLabelHeight)
      await sendZPL(config.zplHost, config.zplPort, zpl)
      res.json({ success: true, method: 'zpl', message: 'Label sent to printer' })
      return
    }

    if (config.method === 'ipp') {
      if (!config.ippUrl) {
        res.status(400).json({ code: 'CONFIG_ERROR', message: 'IPP printer URL not configured' })
        return
      }

      const bcid = type === 'shelf' ? 'code128' : 'datamatrix'
      const opts = type === 'shelf'
        ? { bcid, text: code, scale: 3, height: 12, includetext: true, textxalign: 'center' as const }
        : { bcid, text: code, scale: 4, paddingwidth: 2, paddingheight: 2 }
      const png = await bwipjs.toBuffer(opts)
      await sendIPP(config.ippUrl, png, `barcode-${code}`)
      res.json({ success: true, method: 'ipp', message: 'Print job sent to printer' })
      return
    }

    res.status(400).json({ code: 'CONFIG_ERROR', message: `Unknown print method: ${config.method}` })
  } catch (err) { next(err) }
})

export default router
