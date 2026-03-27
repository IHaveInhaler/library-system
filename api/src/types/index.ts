export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const Role = {
  MEMBER: 'MEMBER',
  LIBRARIAN: 'LIBRARIAN',
  ADMIN: 'ADMIN',
} as const

export type Role = (typeof Role)[keyof typeof Role]

export const Genre = {
  FICTION: 'FICTION',
  NON_FICTION: 'NON_FICTION',
  SCIENCE: 'SCIENCE',
  HISTORY: 'HISTORY',
  BIOGRAPHY: 'BIOGRAPHY',
  TECHNOLOGY: 'TECHNOLOGY',
  ARTS: 'ARTS',
  CHILDREN: 'CHILDREN',
  REFERENCE: 'REFERENCE',
  OTHER: 'OTHER',
} as const

export type Genre = (typeof Genre)[keyof typeof Genre]

export const CopyStatus = {
  AVAILABLE: 'AVAILABLE',
  ON_LOAN: 'ON_LOAN',
  RESERVED: 'RESERVED',
  DAMAGED: 'DAMAGED',
  RETIRED: 'RETIRED',
} as const

export type CopyStatus = (typeof CopyStatus)[keyof typeof CopyStatus]

export const LoanStatus = {
  ACTIVE: 'ACTIVE',
  RETURNED: 'RETURNED',
  OVERDUE: 'OVERDUE',
} as const

export type LoanStatus = (typeof LoanStatus)[keyof typeof LoanStatus]

export const ReservationStatus = {
  PENDING: 'PENDING',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const

export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus]
