/**
 * Shelf label generation using configurable format from settings.
 *
 * Default format: {PREFIX}-{POSITION}{DIGITS}{CHECK}
 *
 * Variables:
 *   {PREFIX}   — Library label prefix (e.g. "CEN")
 *   {POSITION} — Shelf position code (e.g. "L", "GF")
 *   {DIGITS}   — 4 random digits (0000–9999)
 *   {CHECK}    — 1 checksum digit: (sum of DIGITS) mod 10
 *   {RANDOM}   — 4 random alphanumeric characters
 *   {SEQ}      — Not yet implemented (placeholder)
 *
 * Example: CEN-L08097  →  0+8+0+9 = 17 → 17 mod 10 = 7  ✓
 */

import { getSetting } from './settings'

export type ShelfPosition = string // No longer restricted to L/M/R

const DEFAULT_FORMAT = '{PREFIX}-{POSITION}{DIGITS}{CHECK}'

function checksum(digits: string): string {
  const sum = digits.split('').reduce((acc, d) => acc + parseInt(d, 10), 0)
  return String(sum % 10)
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
}

function randomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function generateShelfLabel(prefix: string, position: ShelfPosition): Promise<string> {
  const format = (await getSetting('barcode.shelfFormat')) || DEFAULT_FORMAT
  const normalised = prefix.toUpperCase().slice(0, 3).padEnd(3, 'X')
  const digits = randomDigits(4)
  const check = checksum(digits)
  const random = randomAlphanumeric(4)

  return format
    .replace('{PREFIX}', normalised)
    .replace('{POSITION}', position)
    .replace('{DIGITS}', digits)
    .replace('{CHECK}', check)
    .replace('{RANDOM}', random)
    .replace('{SEQ}', '001') // Placeholder for future sequential numbering
}

export function validateShelfLabel(label: string): boolean {
  // Basic validation — at least 5 chars, alphanumeric with dashes
  return /^[A-Z0-9][-A-Z0-9]{4,}$/i.test(label)
}
