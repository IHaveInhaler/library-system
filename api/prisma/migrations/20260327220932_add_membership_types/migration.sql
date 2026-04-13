-- CreateTable
CREATE TABLE "MembershipType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "durationDays" INTEGER,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 999,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipType_name_key" ON "MembershipType"("name");

-- Seed built-in membership types (must exist before FK on LibraryMembership)
INSERT INTO "MembershipType" ("id", "name", "label", "durationDays", "isStaff", "isBuiltIn", "order", "createdAt", "updatedAt") VALUES
  ('mt-staff',     'STAFF',     'Staff',      NULL, 1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mt-permanent', 'PERMANENT', 'Permanent',  NULL, 0, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mt-yearly',    'YEARLY',    'Yearly',     365,  0, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mt-monthly',   'MONTHLY',   'Monthly',    30,   0, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mt-fixed',     'FIXED',     'Fixed Term', NULL, 0, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LibraryMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "membershipType" TEXT NOT NULL DEFAULT 'PERMANENT',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LibraryMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LibraryMembership_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LibraryMembership_membershipType_fkey" FOREIGN KEY ("membershipType") REFERENCES "MembershipType" ("name") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LibraryMembership" ("createdAt", "endDate", "id", "isActive", "libraryId", "membershipType", "notes", "startDate", "updatedAt", "userId") SELECT "createdAt", "endDate", "id", "isActive", "libraryId", "membershipType", "notes", "startDate", "updatedAt", "userId" FROM "LibraryMembership";
DROP TABLE "LibraryMembership";
ALTER TABLE "new_LibraryMembership" RENAME TO "LibraryMembership";
CREATE UNIQUE INDEX "LibraryMembership_userId_libraryId_key" ON "LibraryMembership"("userId", "libraryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
