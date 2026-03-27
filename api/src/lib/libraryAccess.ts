import { prisma } from './prisma'

/**
 * Returns the set of library IDs the caller may access, or null meaning "unrestricted".
 *
 * - ADMIN                    → null (all libraries, unrestricted)
 * - canViewPublic=true        → public libraries ∪ active memberships (default behaviour)
 * - canViewPublic=false + auth → active memberships only (no public bleed-through)
 * - canViewPublic=false + anon → empty (anonymous users have no memberships)
 */
export async function getAccessibleLibraryIds(
  userId?: string,
  userRole?: string,
  canViewPublic = true,
  canViewAll = false,
): Promise<string[] | null> {
  if (canViewAll) return null

  const now = new Date()

  if (!userId) {
    // Anonymous — can only see public libraries if canViewPublic
    if (!canViewPublic) return []
    return (
      await prisma.library.findMany({
        where: { isPrivate: false, isActive: true },
        select: { id: true },
      })
    ).map((l) => l.id)
  }

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

  if (!canViewPublic) return [...new Set(memberIds)]

  const publicIds = (
    await prisma.library.findMany({
      where: { isPrivate: false, isActive: true },
      select: { id: true },
    })
  ).map((l) => l.id)

  return [...new Set([...publicIds, ...memberIds])]
}
