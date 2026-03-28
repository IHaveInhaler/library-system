import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateShelfLabel } from '../src/lib/shelfLabel'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Wipe in dependency order
  await prisma.libraryMembership.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.loan.deleteMany()
  await prisma.bookCopy.deleteMany()
  await prisma.shelf.deleteMany()
  await prisma.book.deleteMany()
  await prisma.library.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()

  // Users
  const [adminHash, librarianHash, memberHash] = await Promise.all([
    bcrypt.hash('Admin1234!', 12),
    bcrypt.hash('Librarian1!', 12),
    bcrypt.hash('Member123!', 12),
  ])

  const [admin, librarian, member] = await Promise.all([
    prisma.user.create({
      data: { email: 'admin@library.com', passwordHash: adminHash, firstName: 'Admin', lastName: 'User', role: 'ADMIN' },
    }),
    prisma.user.create({
      data: { email: 'librarian@library.com', passwordHash: librarianHash, firstName: 'Jane', lastName: 'Doe', role: 'LIBRARIAN' },
    }),
    prisma.user.create({
      data: { email: 'member@library.com', passwordHash: memberHash, firstName: 'John', lastName: 'Smith', role: 'MEMBER' },
    }),
  ])

  // Libraries — all private
  const [centralLib, westLib] = await Promise.all([
    prisma.library.create({
      data: { name: 'Central City Library', labelPrefix: 'CEN', email: 'central@library.com', isPrivate: true },
    }),
    prisma.library.create({
      data: { name: 'West Branch Library', labelPrefix: 'WST', email: 'west@library.com', isPrivate: true },
    }),
  ])

  // Memberships
  const monthEnd = new Date()
  monthEnd.setMonth(monthEnd.getMonth() + 1)

  await Promise.all([
    // Member: permanent @ Central, monthly @ West
    prisma.libraryMembership.create({
      data: { userId: member.id, libraryId: centralLib.id, membershipType: 'PERMANENT' },
    }),
    prisma.libraryMembership.create({
      data: { userId: member.id, libraryId: westLib.id, membershipType: 'MONTHLY', endDate: monthEnd },
    }),
    // Librarian: permanent access to all libraries
    prisma.libraryMembership.create({
      data: { userId: librarian.id, libraryId: centralLib.id, membershipType: 'PERMANENT' },
    }),
    prisma.libraryMembership.create({
      data: { userId: librarian.id, libraryId: westLib.id, membershipType: 'PERMANENT' },
    }),
  ])

  // Shelves — generate labels first (async)
  const [label1, label2, label3, label4] = await Promise.all([
    generateShelfLabel('CEN', 'L'),
    generateShelfLabel('CEN', 'M'),
    generateShelfLabel('CEN', 'R'),
    generateShelfLabel('WST', 'L'),
  ])

  const [shelf1, shelf2, shelf3, shelf4] = await Promise.all([
    prisma.shelf.create({
      data: {
        code: 'FIC-01',
        label: label1,
        position: 'L',
        genre: 'FICTION',
        location: 'Ground floor, north wing, rows 1–5',
        libraryId: centralLib.id,
      },
    }),
    prisma.shelf.create({
      data: {
        code: 'SCI-01',
        label: label2,
        position: 'M',
        genre: 'SCIENCE',
        location: 'First floor, east wing, rows 1–3',
        libraryId: centralLib.id,
      },
    }),
    prisma.shelf.create({
      data: {
        code: 'TECH-01',
        label: label3,
        position: 'R',
        genre: 'TECHNOLOGY',
        location: 'First floor, east wing, rows 4–6',
        libraryId: centralLib.id,
      },
    }),
    prisma.shelf.create({
      data: {
        code: 'FIC-01',
        label: label4,
        position: 'L',
        genre: 'FICTION',
        location: 'Ground floor, main hall',
        libraryId: westLib.id,
      },
    }),
  ])

  // Books
  const [book1, book2, book3] = await Promise.all([
    prisma.book.create({
      data: {
        isbn: '9780743273565',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        publisher: 'Scribner',
        publishedYear: 1925,
        genre: 'FICTION',
        description: 'A novel about the mysterious millionaire Jay Gatsby and his obsession with Daisy Buchanan.',
        totalPages: 180,
      },
    }),
    prisma.book.create({
      data: {
        isbn: '9780374529550',
        title: 'A Brief History of Time',
        author: 'Stephen Hawking',
        publisher: 'Bantam Books',
        publishedYear: 1988,
        genre: 'SCIENCE',
        description: 'A landmark volume in science writing about the origins and fate of the universe.',
        totalPages: 212,
      },
    }),
    prisma.book.create({
      data: {
        isbn: '9780134685991',
        title: 'The Pragmatic Programmer',
        author: 'David Thomas, Andrew Hunt',
        publisher: 'Addison-Wesley',
        publishedYear: 2019,
        genre: 'TECHNOLOGY',
        description: 'Your journey to mastery — essential software development wisdom.',
        totalPages: 352,
      },
    }),
  ])

  // Book Copies
  await Promise.all([
    prisma.bookCopy.create({ data: { barcode: 'CC-GG-001', bookId: book1.id, shelfId: shelf1.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-GG-002', bookId: book1.id, shelfId: shelf1.id } }),
    prisma.bookCopy.create({ data: { barcode: 'WB-GG-001', bookId: book1.id, shelfId: shelf4.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-BHT-001', bookId: book2.id, shelfId: shelf2.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-PP-001', bookId: book3.id, shelfId: shelf3.id } }),
    prisma.bookCopy.create({ data: { barcode: 'CC-PP-002', bookId: book3.id, shelfId: shelf3.id } }),
  ])

  console.log('Seed complete.')
  console.log('  Admin:     admin@library.com     / Admin1234!')
  console.log('  Librarian: librarian@library.com / Librarian1!')
  console.log('  Member:    member@library.com    / Member123!')
  console.log('')
  console.log('  Libraries: all private')
  console.log('  Member has: PERMANENT membership @ Central, MONTHLY membership @ West')
  console.log('  Librarian has: PERMANENT membership @ Central and West')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
