/**
 * Shelf label format: {PREFIX}-{POSITION}{DIGITS}{CHECKSUM}
 *
 * PREFIX   — 3-letter library prefix (e.g. "CEN")
 * POSITION — L | M | R  (Left / Middle / Right, configurable per shelf)
 * DIGITS   — 4 random digits (0000–9999)
 * CHECKSUM — 1 digit: (sum of the 4 random digits) mod 10
 *
 * Example: CEN-L08097  →  0+8+0+9 = 17 → 17 mod 10 = 7  ✓
 */

export type ShelfPosition = 'L' | 'M' | 'R'

export const SHELF_POSITIONS: ShelfPosition[] = ['L', 'M', 'R']

export const POSITION_LABELS: Record<ShelfPosition, string> = {
  L: 'Left',
  M: 'Middle',
  R: 'Right',
}

function checksum(digits: string): string {
  const sum = digits.split('').reduce((acc, d) => acc + parseInt(d, 10), 0)
  return String(sum % 10)
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
}

export function generateShelfLabel(prefix: string, position: ShelfPosition): string {
  const normalised = prefix.toUpperCase().slice(0, 3).padEnd(3, 'X')
  const digits = randomDigits(4)
  const check = checksum(digits)
  return `${normalised}-${position}${digits}${check}`
}

export function validateShelfLabel(label: string): boolean {
  // Format: 3 alpha chars, dash, 1 position char, 4 digits, 1 checksum digit
  const match = label.match(/^([A-Z]{3})-([LMR])(\d{4})(\d)$/)
  if (!match) return false

  const [, , , digits, provided] = match
  return checksum(digits) === provided
}
