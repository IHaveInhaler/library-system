import { api } from './client'
import type { User, Library, Book } from '../types'

export const uploadsApi = {
  uploadAvatar: (userId: string, file: File) => {
    const form = new FormData()
    form.append('avatar', file)
    return api.post<User>(`/users/${userId}/avatar`, form).then((r) => r.data)
  },

  deleteAvatar: (userId: string) =>
    api.delete(`/users/${userId}/avatar`),

  uploadLibraryImage: (libraryId: string, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return api.post<Library>(`/libraries/${libraryId}/image`, form).then((r) => r.data)
  },

  deleteLibraryImage: (libraryId: string) =>
    api.delete(`/libraries/${libraryId}/image`),

  uploadBookCover: (bookId: string, file: File) => {
    const form = new FormData()
    form.append('cover', file)
    return api.post<Book>(`/books/${bookId}/cover`, form).then((r) => r.data)
  },

  deleteBookCover: (bookId: string) =>
    api.delete(`/books/${bookId}/cover`),
}
