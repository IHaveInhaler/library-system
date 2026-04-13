-- AlterTable
ALTER TABLE "Loan" ADD COLUMN "conditionAtCheckout" TEXT;

-- CreateTable
CREATE TABLE "DamageReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "bookCopyId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conditionBefore" TEXT,
    "conditionAfter" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DamageReport_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DamageReport_bookCopyId_fkey" FOREIGN KEY ("bookCopyId") REFERENCES "BookCopy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DamageReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
