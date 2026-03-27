import { prisma } from './prisma'

/**
 * Returns the set of library IDs the caller may access, or null meaning "unrestricted".
 *
 * - ADMIN / LIBRARIAN   → null (all libraries)
 * - authenticated MEMBER → public libraries ∪ their active patron memberships
 * - anonymous            → public libraries only
 */
export async function getAccessibleLibraryIds(
  userId?: string,
  userRole?: string,
): Promise<string[] | null> {
  if (userRole === 'ADMIN' || userRole === 'LIBRARIAN') return null

  const publicIds = (
    await prisma.library.findMany({
      where: { isPrivate: false, isActive: true },
      select: { id: true },
    })
  ).map((l) => l.id)

  if (!userId) return publicIds

  const now = new Date()
  const memberIds = (
    await prisma.libraryMembership.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      select: { libraryId: true },
    })
  ).map((m) => m.libraryId)

  return [...new Set([...publicIds, ...memberIds])]
}
