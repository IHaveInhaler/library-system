import { Genre } from '../types'

interface OpenLibraryData {
  title?: string
  authors?: { name: string }[]
  publishers?: { name: string }[]
  publish_date?: string
  number_of_pages?: number
  subjects?: { name: string }[]
  cover?: { small?: string; medium?: string; large?: string }
  description?: string | { value: string }
}

export interface IsbnMetadata {
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
}

// Map Open Library subject names to our Genre enum
const SUBJECT_GENRE_MAP: [string, Genre][] = [
  ['fiction', 'FICTION'],
  ['novel', 'FICTION'],
  ['science fiction', 'FICTION'],
  ['fantasy', 'FICTION'],
  ['mystery', 'FICTION'],
  ['thriller', 'FICTION'],
  ['romance', 'FICTION'],
  ['science', 'SCIENCE'],
  ['physics', 'SCIENCE'],
  ['chemistry', 'SCIENCE'],
  ['biology', 'SCIENCE'],
  ['mathematics', 'SCIENCE'],
  ['history', 'HISTORY'],
  ['biography', 'BIOGRAPHY'],
  ['autobiography', 'BIOGRAPHY'],
  ['memoir', 'BIOGRAPHY'],
  ['technology', 'TECHNOLOGY'],
  ['computer', 'TECHNOLOGY'],
  ['programming', 'TECHNOLOGY'],
  ['engineering', 'TECHNOLOGY'],
  ['art', 'ARTS'],
  ['music', 'ARTS'],
  ['children', 'CHILDREN'],
  ['juvenile', 'CHILDREN'],
  ['reference', 'REFERENCE'],
  ['dictionary', 'REFERENCE'],
  ['encyclopedia', 'REFERENCE'],
]

function inferGenre(subjects: { name: string }[] = []): Genre {
  const subjectNames = subjects.map(s => s.name.toLowerCase())
  for (const [keyword, genre] of SUBJECT_GENRE_MAP) {
    if (subjectNames.some(s => s.includes(keyword))) return genre
  }
  return 'OTHER'
}

function parseYear(dateStr?: string): number | undefined {
  if (!dateStr) return undefined
  const match = dateStr.match(/\d{4}/)
  return match ? parseInt(match[0], 10) : undefined
}

export async function fetchByIsbn(isbn: string): Promise<IsbnMetadata | null> {
  const cleanIsbn = isbn.replace(/[-\s]/g, '')
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'LibraryPortal/1.0' },
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) return null

  const json = (await response.json()) as Record<string, OpenLibraryData>
  const data = json[`ISBN:${cleanIsbn}`]
  if (!data) return null

  const description =
    typeof data.description === 'string'
      ? data.description
      : data.description?.value

  return {
    isbn: cleanIsbn,
    title: data.title ?? 'Unknown Title',
    author: data.authors?.map(a => a.name).join(', ') ?? 'Unknown Author',
    publisher: data.publishers?.[0]?.name,
    publishedYear: parseYear(data.publish_date),
    genre: inferGenre(data.subjects),
    description,
    coverUrl: data.cover?.medium ?? data.cover?.large,
    totalPages: data.number_of_pages,
    language: 'en',
  }
}
