import { api } from './client'

export interface BookNote {
  id: string
  userId: string
  bookId: string
  encryptedContent: string
  iv: string
  createdAt: string
  updatedAt: string
}

export const bookNotesApi = {
  get: (bookId: string) =>
    api.get<BookNote | null>(`/books/${bookId}/notes`).then((r) => r.data),

  save: (bookId: string, data: { encryptedContent: string; iv: string }) =>
    api.put<BookNote>(`/books/${bookId}/notes`, data).then((r) => r.data),

  remove: (bookId: string) => api.delete(`/books/${bookId}/notes`),
}

// ── Zero-knowledge encryption helpers ──────────────────────────────────────
// The encryption key is derived from the user's password or a stored key.
// For simplicity, we use a key derived from the user's ID + a local passphrase.

const ALGO = 'AES-GCM'

async function getKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('library-portal-notes'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptNote(content: string, passphrase: string): Promise<{ encryptedContent: string; iv: string }> {
  const key = await getKey(passphrase)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, enc.encode(content))
  return {
    encryptedContent: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

export async function decryptNote(encryptedContent: string, iv: string, passphrase: string): Promise<string> {
  const key = await getKey(passphrase)
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(encryptedContent), (c) => c.charCodeAt(0))
  const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv: ivBytes }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}
