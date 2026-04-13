-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT true,
    "deactivationReason" TEXT,
    "activationReason" TEXT,
    "pending2FA" BOOLEAN NOT NULL DEFAULT false,
    "totpSecret" TEXT,
    "totpVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("activationReason", "avatarUrl", "createdAt", "deactivationReason", "email", "emailVerified", "firstName", "id", "isActive", "lastName", "passwordHash", "role", "totpSecret", "totpVerified", "updatedAt") SELECT "activationReason", "avatarUrl", "createdAt", "deactivationReason", "email", "emailVerified", "firstName", "id", "isActive", "lastName", "passwordHash", "role", "totpSecret", "totpVerified", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
