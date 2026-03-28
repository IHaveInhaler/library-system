import { prisma } from './prisma'
import { ForbiddenError } from '../errors'

/**
 * Checks if a user has active Staff membership to a library.
 * ADMINs always pass. Throws ForbiddenError if not.
 */
export async function requireStaffAccess(userId: string, userRole: string, libraryId: string): Promise<void> {
  if (userRole === 'ADMIN') return

  const membership = await prisma.libraryMembership.findUnique({
    where: { userId_libraryId: { userId, libraryId } },
    include: { type: true },
  })

  if (!membership || !membership.isActive || !membership.type?.isStaff) {
    throw new ForbiddenError('You need Staff access to this library')
  }
}

/**
 * Returns library IDs where the user has active Staff membership.
 * ADMINs get null (meaning all libraries).
 */
export async function getStaffLibraryIds(userId: string, userRole: string): Promise<string[] | null> {
  if (userRole === 'ADMIN') return null

  const memberships = await prisma.libraryMembership.findMany({
    where: {
      userId,
      isActive: true,
      type: { isStaff: true },
    },
    select: { libraryId: true },
  })

  return memberships.map((m) => m.libraryId)
}
