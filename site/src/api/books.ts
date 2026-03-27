import { api } from './client'
import type { Book, BookCopy, PaginatedResponse } from '../types'

export interface BookFilters {
  page?: number
  limit?: number
  genre?: string
  search?: string
  author?: string
  language?: string
  shelfId?: string
}

export interface IsbnLookupResult {
  source: 'database' | 'openlibrary'
  book: Partial<Book>
  alreadyExists: boolean
}

export const booksApi = {
  list: (params: BookFilters = {}) =>
    api.get<PaginatedResponse<Book>>('/books', { params }).then((r) => r.data),

  get: (id: string) => api.get<Book>(`/books/${id}`).then((r) => r.data),

  copies: (id: string) => api.get<BookCopy[]>(`/books/${id}/copies`).then((r) => r.data),

  lookupIsbn: (isbn: string) =>
    api.get<IsbnLookupResult>(`/books/isbn/${isbn}`).then((r) => r.data),

  create: (data: Partial<Book>) =>
    api.post<Book>('/books', data).then((r) => r.data),

  createFromIsbn: (data: { isbn: string; genre?: string }) =>
    api.post<Book>('/books/isbn', data).then((r) => r.data),

  update: (id: string, data: Partial<Book>) =>
    api.patch<Book>(`/books/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/books/${id}`),
}
