export type Role = string
export type Genre = 'FICTION' | 'NON_FICTION' | 'SCIENCE' | 'HISTORY' | 'BIOGRAPHY' | 'TECHNOLOGY' | 'ARTS' | 'CHILDREN' | 'REFERENCE' | 'OTHER'
export type CopyStatus = 'AVAILABLE' | 'ON_LOAN' | 'RESERVED' | 'DAMAGED' | 'RETIRED'
export type LoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE'
export type ReservationStatus = 'PENDING' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED'
export type ShelfPosition = 'L' | 'M' | 'R'

export interface PaginatedResponse<T> {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface ApiError {
  code: string
  message: string
  errors?: { message: string; path: (string | number)[] }[]
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
  role: Role
  isActive: boolean
  emailVerified: boolean
  deactivationReason?: string | null
  activationReason?: string | null
  staffLibraryIds?: string[] | null  // null = admin (all libraries), [] = none, [...] = specific
  requires2FASetup?: boolean
  required2FAMethod?: 'any' | 'security-key'
  createdAt: string
  updatedAt: string
}

export interface Library {
  id: string
  name: string
  labelPrefix: string
  email?: string
  imageUrl?: string | null
  isActive: boolean
  isPrivate: boolean
  createdAt: string
  updatedAt: string
  _count?: { shelves: number }
  printMethod?: string | null
  printZplHost?: string | null
  printZplPort?: string | null
  printZplLabelWidth?: string | null
  printZplLabelHeight?: string | null
  printIppUrl?: string | null
}

export interface LibraryMembership {
  id: string
  userId: string
  libraryId: string
  membershipType: string
  startDate: string
  endDate?: string
  isActive: boolean
  notes?: string
  createdAt: string
  updatedAt: string
  user?: { id: string; firstName: string; lastName: string; email: string; role: string }
  type?: { id: string; name: string; label: string; durationDays: number | null; isStaff: boolean }
}

export interface Shelf {
  id: string
  code: string
  label: string
  location?: string
  position: ShelfPosition
  genre: Genre
  capacity: number
  libraryId: string
  library: { id: string; name: string; labelPrefix: string }
  createdAt: string
  updatedAt: string
  _count?: { bookCopies: number }
}

export interface Book {
  id: string
  isbn: string
  title: string
  author: string
  publisher?: string
  publishedYear?: number
  genre: Genre
  description?: string
  coverUrl?: string
  totalPages?: number
  language: string
  createdAt: string
  updatedAt: string
  _count?: { copies: number }
  availableCount?: number
}

export interface BookCopy {
  id: string
  barcode: string
  condition: string
  status: CopyStatus
  bookId: string
  book: { id: string; title: string; author: string; isbn: string; genre: Genre }
  shelfId: string
  shelf: { id: string; code: string; label: string; location?: string; library: { id: string; name: string } }
  acquiredAt: string
  createdAt: string
  updatedAt: string
}

export interface Loan {
  id: string
  userId: string
  user: { id: string; firstName: string; lastName: string; email: string }
  bookCopyId: string
  bookCopy: { id: string; barcode: string; condition: string; book: { id: string; title: string; author: string; isbn: string }; shelf: { id: string; library: { id: string; name: string } } }
  issuedById?: string
  issuedBy?: { id: string; firstName: string; lastName: string; email: string }
  status: LoanStatus
  borrowedAt: string
  dueDate: string
  returnedAt?: string
  renewCount: number
  notes?: string
  notesEditedBy?: Array<{ id: string; name: string; at: string }>
  conditionAtCheckout?: string
  damageReports?: DamageReport[]
  createdAt: string
  updatedAt: string
}

export interface DamageReport {
  id: string
  loanId: string
  bookCopyId: string
  bookCopy?: { id: string; book: { id: string; title: string; author: string; isbn: string } }
  reportedById: string
  reportedBy: { id: string; firstName: string; lastName: string; email: string }
  type: 'STAFF_RETURN' | 'STAFF_REPORT' | 'MEMBER_REPORT'
  conditionBefore?: string
  conditionAfter?: string
  description?: string
  resolvedAt?: string
  resolvedById?: string
  resolvedNote?: string
  resolution?: 'DISMISSED' | 'WARNING' | 'CONFIRMED'
  createdAt: string
}

export interface Reservation {
  id: string
  userId: string
  user: { id: string; firstName: string; lastName: string; email: string }
  bookId: string
  book: { id: string; title: string; author: string; isbn: string }
  bookCopyId?: string
  bookCopy?: BookCopy
  status: ReservationStatus
  reservedAt: string
  expiresAt?: string
  fulfilledAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  actorId?: string | null
  actorName?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  targetName?: string | null
  metadata?: string | null
  createdAt: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}
