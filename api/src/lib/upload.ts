import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads')

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => {
    // Only use random hex names — never trust original filename
    const name = crypto.randomBytes(20).toString('hex')
    // Extension determined by MIME validation, not user input
    cb(null, name)
  },
})

// SECURITY: Only allow specific MIME types with magic byte validation
const ALLOWED_MIMES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1,                  // Only 1 file per request
    fields: 10,                // Limit form fields
  },
  fileFilter: (_req, file, cb) => {
    // SECURITY: Validate MIME type against whitelist
    if (!ALLOWED_MIMES[file.mimetype]) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed'))
    }
    cb(null, true)
  },
})

/**
 * Validate file magic bytes match the claimed MIME type.
 * Call AFTER multer has saved the file.
 * Deletes the file if validation fails.
 */
export async function validateMagicBytes(filepath: string, mimetype: string): Promise<boolean> {
  const expectedHeaders = ALLOWED_MIMES[mimetype]
  if (!expectedHeaders) {
    safeDelete(filepath)
    return false
  }

  try {
    const fd = fs.openSync(filepath, 'r')
    const buffer = Buffer.alloc(8)
    fs.readSync(fd, buffer, 0, 8, 0)
    fs.closeSync(fd)

    const valid = expectedHeaders.some((header) =>
      buffer.subarray(0, header.length).equals(header)
    )

    if (!valid) {
      safeDelete(filepath)
      return false
    }
    return true
  } catch {
    safeDelete(filepath)
    return false
  }
}

/**
 * Rename the file to add the correct extension based on MIME type.
 * Returns the new filename.
 */
export function addExtension(filepath: string, mimetype: string): string {
  const ext = MIME_EXTENSIONS[mimetype] || ''
  const newPath = filepath + ext
  fs.renameSync(filepath, newPath)
  return path.basename(newPath)
}

function safeDelete(filepath: string): void {
  try { if (fs.existsSync(filepath)) fs.unlinkSync(filepath) } catch { /* ignore */ }
}

export function deleteFile(filename: string): void {
  // SECURITY: Prevent path traversal — only delete from upload dir
  const safeName = path.basename(filename)
  const filepath = path.join(UPLOAD_DIR, safeName)
  safeDelete(filepath)
}

export function getUploadUrl(filename: string): string {
  return `/uploads/${path.basename(filename)}`
}

export { UPLOAD_DIR }
