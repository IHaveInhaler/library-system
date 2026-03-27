export type Role = 'MEMBER' | 'LIBRARIAN' | 'ADMIN'
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
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Library {
  id: string
  name: string
  labelPrefix: string
  email?: string
  isActive: boolean
  isPrivate: boolean
  createdAt: string
  updatedAt: string
  _count?: { shelves: number }
}

export type MembershipType = 'PERMANENT' | 'MONTHLY' | 'FIXED'

export interface LibraryMembership {
  id: string
  userId: string
  libraryId: string
  membershipType: MembershipType
  startDate: string
  endDate?: string
  isActive: boolean
  notes?: string
  createdAt: string
  updatedAt: string
  user?: { id: string; firstName: string; lastName: string; email: string; role: string }
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
  condition: 'GOOD' | 'FAIR' | 'POOR'
  status: CopyStatus
  bookId: string
  book: { id: string; title: string; author: string; isbn: string; genre: Genre }
  shelfId: string
  shelf: { id: string; code: string; label: string; library: { id: string; name: string } }
  acquiredAt: string
  createdAt: string
  updatedAt: string
}

export interface Loan {
  id: string
  userId: string
  user: { id: string; firstName: string; lastName: string; email: string }
  bookCopyId: string
  bookCopy: { id: string; book: { id: string; title: string; author: string; isbn: string }; shelf: { id: string; library: { id: string; name: string } } }
  status: LoanStatus
  borrowedAt: string
  dueDate: string
  returnedAt?: string
  renewCount: number
  notes?: string
  createdAt: string
  updatedAt: string
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

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}
