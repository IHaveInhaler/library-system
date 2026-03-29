# Damage Reporting & Dynamic Conditions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable book conditions, a return-with-condition flow, damage reporting (staff + member), and damage history on users and loans.

**Architecture:** New `DamageReport` model with relations to Loan, BookCopy, User. Conditions become a dynamic setting (`copy.conditions`) instead of a hardcoded enum. Return flow becomes a modal that captures condition, status, and optional damage report. Damage history surfaces on loan drawers and user drawers.

**Tech Stack:** Prisma (SQLite), Express, Zod, React, TanStack Query, Tailwind CSS, Lucide icons

---

## File Structure

### New Files
- `api/src/modules/damageReports/damageReports.schemas.ts` — Zod schemas for create/query
- `api/src/modules/damageReports/damageReports.service.ts` — CRUD + query logic
- `api/src/modules/damageReports/damageReports.controller.ts` — Request handlers
- `api/src/modules/damageReports/damageReports.router.ts` — Express routes
- `site/src/api/damageReports.ts` — Frontend API client

### Modified Files
- `api/prisma/schema.prisma` — Add DamageReport model, conditionAtCheckout on Loan, relations
- `api/src/app.ts` — Mount damage reports router
- `api/src/modules/loans/loans.service.ts` — Store conditionAtCheckout on create, accept return params
- `api/src/modules/loans/loans.controller.ts` — Pass return body, create damage report on return
- `api/src/modules/loans/loans.schemas.ts` — Add returnLoanSchema
- `api/src/modules/loans/loans.router.ts` — Add validation to return route
- `api/src/modules/bookCopies/bookCopies.schemas.ts` — Remove hardcoded Condition enum, use dynamic validation
- `api/src/modules/bookCopies/bookCopies.service.ts` — Add getConditions helper
- `api/src/modules/settings/settings.controller.ts` — Add `copy.conditions` to ALLOWED_KEYS and KEY_PERMISSIONS
- `api/prisma/seed.ts` — Seed copy.conditions setting and sample damage report
- `api/src/modules/setup/setup.service.ts` — Seed copy.conditions in devSeed
- `site/src/types.ts` — Update Loan and BookCopy types, add DamageReport type
- `site/src/api/settings.ts` — Add `copy.conditions` to SettingKey
- `site/src/api/loans.ts` — Update return method signature
- `site/src/pages/admin/AdminSettingsPage.tsx` — Add BookConditionsSettings section
- `site/src/pages/admin/LoansPage.tsx` — Return modal, damage section in drawer, report damage button, warning icons
- `site/src/pages/member/DashboardPage.tsx` — Show condition on active loans, report damage button
- `site/src/pages/admin/UsersPage.tsx` — Damage warning banner and badge
- `site/src/pages/admin/ManageBooksPage.tsx` — Use dynamic conditions for dropdowns

---

### Task 1: Database — DamageReport Model & Loan Changes

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Step 1: Add DamageReport model and update relations**

In `api/prisma/schema.prisma`, add after the Loan model (after line 239):

```prisma
model DamageReport {
  id              String   @id @default(uuid())
  loanId          String
  loan            Loan     @relation(fields: [loanId], references: [id])
  bookCopyId      String
  bookCopy        BookCopy @relation(fields: [bookCopyId], references: [id])
  reportedById    String
  reportedBy      User     @relation("damageReporter", fields: [reportedById], references: [id])
  type            String   // STAFF_RETURN | STAFF_REPORT | MEMBER_REPORT
  conditionBefore String?
  conditionAfter  String?
  description     String?
  createdAt       DateTime @default(now())
}
```

Add `conditionAtCheckout String?` to the Loan model (after `notesEditedBy` field, line 236):

```prisma
  conditionAtCheckout String?
```

Add relation arrays:
- On `Loan` model (after `updatedAt`): `damageReports DamageReport[]`
- On `BookCopy` model (after `reservations`): `damageReports DamageReport[]`
- On `User` model (after `bookNotes`): `damageReports DamageReport[] @relation("damageReporter")`

- [ ] **Step 2: Run migration**

```bash
cd api && npx prisma migrate dev --name add-damage-reports
```

Expected: Migration created and applied, Prisma Client regenerated.

- [ ] **Step 3: Verify types generated**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

---

### Task 2: Dynamic Conditions Setting — Backend

**Files:**
- Modify: `api/src/modules/settings/settings.controller.ts`
- Modify: `api/src/modules/bookCopies/bookCopies.schemas.ts`
- Modify: `api/src/modules/bookCopies/bookCopies.service.ts`
- Modify: `api/src/modules/loans/loans.service.ts` (getLoanConfig)

- [ ] **Step 1: Add copy.conditions to settings ALLOWED_KEYS**

In `api/src/modules/settings/settings.controller.ts`, add `'copy.conditions'` to the `ALLOWED_KEYS` array (after `'loan.reservationExpiryDays'` at line 45):

```typescript
  'copy.conditions',
```

Add to `KEY_PERMISSIONS` (after `'loan.'` entry at line 116):

```typescript
  'copy.': 'CONFIGURE_GENERAL',
```

- [ ] **Step 2: Add getConditions helper to bookCopies service**

In `api/src/modules/bookCopies/bookCopies.service.ts`, add at the top (after imports):

```typescript
import { getSetting } from '../../lib/settings'

const DEFAULT_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']

export async function getConditions(): Promise<string[]> {
  const raw = await getSetting('copy.conditions')
  if (!raw) return DEFAULT_CONDITIONS
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CONDITIONS
  } catch {
    return DEFAULT_CONDITIONS
  }
}
```

- [ ] **Step 3: Replace hardcoded Condition enum in bookCopies schemas**

In `api/src/modules/bookCopies/bookCopies.schemas.ts`, replace the entire file:

```typescript
import { z } from 'zod'
import { CopyStatus } from '../../types'

export const createBookCopySchema = z.object({
  condition: z.string().min(1).max(50).default('GOOD'),
  bookId: z.string().uuid(),
  shelfId: z.string().uuid(),
  acquiredAt: z.coerce.date().optional(),
})

export const updateBookCopySchema = z.object({
  barcode: z.string().min(1).max(100).optional(),
  condition: z.string().min(1).max(50).optional(),
  shelfId: z.string().uuid().optional(),
})

export const setCopyStatusSchema = z.object({
  status: z.enum(['DAMAGED', 'RETIRED', 'AVAILABLE']),
})

export const copyQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  bookId: z.string().uuid().optional(),
  shelfId: z.string().uuid().optional(),
  status: z.nativeEnum(CopyStatus).optional(),
})

export type CreateBookCopyInput = z.infer<typeof createBookCopySchema>
export type UpdateBookCopyInput = z.infer<typeof updateBookCopySchema>
export type SetCopyStatusInput = z.infer<typeof setCopyStatusSchema>
export type CopyQueryInput = z.infer<typeof copyQuerySchema>
```

- [ ] **Step 4: Expose conditions in loan config endpoint**

In `api/src/modules/loans/loans.service.ts`, update `getLoanConfig` (around line 22) to also return conditions. Add import at top:

```typescript
import { getConditions } from '../bookCopies/bookCopies.service'
```

Then update the `getLoanConfig` function return:

```typescript
export async function getLoanConfig() {
  const [durationDays, renewalDays, maxRenewals, renewalCutoffDays, conditions] = await Promise.all([
    getSetting('loan.durationDays'),
    getSetting('loan.renewalDays'),
    getSetting('loan.maxRenewals'),
    getSetting('loan.renewalCutoffDays'),
    getConditions(),
  ])
  return {
    durationDays: parseInt(durationDays || '', 10) || env.LOAN_DURATION_DAYS,
    renewalDays: parseInt(renewalDays || '', 10) || 7,
    maxRenewals: parseInt(maxRenewals || '', 10) || env.MAX_RENEW_COUNT,
    renewalCutoffDays: parseInt(renewalCutoffDays || '', 10) || 14,
    conditions,
  }
}
```

- [ ] **Step 5: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

---

### Task 3: Damage Reports API Module

**Files:**
- Create: `api/src/modules/damageReports/damageReports.schemas.ts`
- Create: `api/src/modules/damageReports/damageReports.service.ts`
- Create: `api/src/modules/damageReports/damageReports.controller.ts`
- Create: `api/src/modules/damageReports/damageReports.router.ts`
- Modify: `api/src/app.ts`

- [ ] **Step 1: Create schemas**

Create `api/src/modules/damageReports/damageReports.schemas.ts`:

```typescript
import { z } from 'zod'

export const createDamageReportSchema = z.object({
  loanId: z.string().uuid(),
  bookCopyId: z.string().uuid(),
  type: z.enum(['STAFF_RETURN', 'STAFF_REPORT', 'MEMBER_REPORT']),
  conditionBefore: z.string().max(50).optional(),
  conditionAfter: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
})

export const damageReportQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  loanId: z.string().uuid().optional(),
  bookCopyId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
})

export type CreateDamageReportInput = z.infer<typeof createDamageReportSchema>
export type DamageReportQueryInput = z.infer<typeof damageReportQuerySchema>
```

- [ ] **Step 2: Create service**

Create `api/src/modules/damageReports/damageReports.service.ts`:

```typescript
import { prisma } from '../../lib/prisma'
import { NotFoundError } from '../../errors'
import { CreateDamageReportInput, DamageReportQueryInput } from './damageReports.schemas'

const damageReportInclude = {
  loan: { select: { id: true, userId: true } },
  bookCopy: {
    include: {
      book: { select: { id: true, title: true, author: true, isbn: true } },
    },
  },
  reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
}

export async function listDamageReports(query: DamageReportQueryInput) {
  const { page, limit, loanId, bookCopyId, userId } = query
  const skip = (page - 1) * limit

  const where = {
    ...(loanId && { loanId }),
    ...(bookCopyId && { bookCopyId }),
    ...(userId && { loan: { userId } }),
  }

  const [data, total] = await prisma.$transaction([
    prisma.damageReport.findMany({ where, skip, take: limit, include: damageReportInclude, orderBy: { createdAt: 'desc' } }),
    prisma.damageReport.count({ where }),
  ])

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

export async function getDamageReport(id: string) {
  const report = await prisma.damageReport.findUnique({ where: { id }, include: damageReportInclude })
  if (!report) throw new NotFoundError('Damage report')
  return report
}

export async function createDamageReport(input: CreateDamageReportInput, reportedById: string) {
  return prisma.damageReport.create({
    data: { ...input, reportedById },
    include: damageReportInclude,
  })
}

export async function getDamageReportsForLoan(loanId: string) {
  return prisma.damageReport.findMany({
    where: { loanId },
    include: damageReportInclude,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getUserDamageReportCount(userId: string) {
  return prisma.damageReport.count({
    where: {
      loan: { userId },
      type: { in: ['STAFF_RETURN', 'STAFF_REPORT'] },
    },
  })
}

export async function getUserDamageReports(userId: string) {
  return prisma.damageReport.findMany({
    where: {
      loan: { userId },
      type: { in: ['STAFF_RETURN', 'STAFF_REPORT'] },
    },
    include: damageReportInclude,
    orderBy: { createdAt: 'desc' },
  })
}
```

- [ ] **Step 3: Create controller**

Create `api/src/modules/damageReports/damageReports.controller.ts`:

```typescript
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { ForbiddenError, NotFoundError } from '../../errors'
import { logAction } from '../../lib/audit'
import * as service from './damageReports.service'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listDamageReports(req.query as any)
    res.json(result)
  } catch (err) { next(err) }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await service.getDamageReport(req.params.id)
    res.json(report)
  } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, loanId } = req.body

    // For MEMBER_REPORT, verify the loan belongs to this user
    if (type === 'MEMBER_REPORT') {
      const loan = await prisma.loan.findUnique({ where: { id: loanId } })
      if (!loan) throw new NotFoundError('Loan')
      if (loan.userId !== req.user!.id) throw new ForbiddenError('You can only report damage on your own loans')
    }

    const report = await service.createDamageReport(req.body, req.user!.id)
    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'DAMAGE_REPORTED',
      targetType: 'DamageReport',
      targetId: report.id,
      metadata: { type, loanId: report.loanId, bookCopyId: report.bookCopyId },
    })
    res.status(201).json(report)
  } catch (err) { next(err) }
}

export async function getForLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const reports = await service.getDamageReportsForLoan(req.params.loanId)
    res.json(reports)
  } catch (err) { next(err) }
}

export async function getUserDamageInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [count, reports] = await Promise.all([
      service.getUserDamageReportCount(req.params.userId),
      service.getUserDamageReports(req.params.userId),
    ])
    res.json({ count, reports })
  } catch (err) { next(err) }
}
```

- [ ] **Step 4: Create router**

Create `api/src/modules/damageReports/damageReports.router.ts`:

```typescript
import { Router } from 'express'
import { validate } from '../../middleware/validate'
import { authorize } from '../../middleware/authorize'
import { createDamageReportSchema, damageReportQuerySchema } from './damageReports.schemas'
import * as controller from './damageReports.controller'

const router = Router()

router.get('/', authorize('LIBRARIAN', 'ADMIN'), validate(damageReportQuerySchema, 'query'), controller.list)
router.get('/:id', authorize('LIBRARIAN', 'ADMIN'), controller.getById)
router.post('/', validate(createDamageReportSchema), controller.create)
router.get('/loan/:loanId', controller.getForLoan)
router.get('/user/:userId', authorize('LIBRARIAN', 'ADMIN'), controller.getUserDamageInfo)

export default router
```

- [ ] **Step 5: Mount router in app.ts**

In `api/src/app.ts`, add import at the top with other router imports:

```typescript
import damageReportsRouter from './modules/damageReports/damageReports.router'
```

Add mount after the loans router (after `app.use('/api/loans', authenticate, loansRouter)` at line 101):

```typescript
  app.use('/api/damage-reports', authenticate, damageReportsRouter)
```

- [ ] **Step 6: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

---

### Task 4: Return Flow — Backend Changes

**Files:**
- Modify: `api/src/modules/loans/loans.schemas.ts`
- Modify: `api/src/modules/loans/loans.service.ts`
- Modify: `api/src/modules/loans/loans.controller.ts`
- Modify: `api/src/modules/loans/loans.router.ts`

- [ ] **Step 1: Add returnLoanSchema and store conditionAtCheckout on create**

In `api/src/modules/loans/loans.schemas.ts`, add after `updateLoanSchema`:

```typescript
export const returnLoanSchema = z.object({
  condition: z.string().min(1).max(50).optional(),
  copyStatus: z.enum(['AVAILABLE', 'DAMAGED', 'RETIRED']).default('AVAILABLE'),
  reportDamage: z.boolean().default(false),
  damageDescription: z.string().max(2000).optional(),
})

export type ReturnLoanInput = z.infer<typeof returnLoanSchema>
```

- [ ] **Step 2: Update createLoan to store conditionAtCheckout**

In `api/src/modules/loans/loans.service.ts`, inside the `createLoan` function's transaction (around line 92), update the `tx.loan.create` data to include `conditionAtCheckout`:

```typescript
    const loan = await tx.loan.create({
      data: {
        userId: input.userId,
        bookCopyId: input.bookCopyId,
        dueDate: input.dueDate,
        notes: input.notes,
        issuedById: input.issuedById,
        conditionAtCheckout: freshCopy.condition,
      },
      include: loanInclude,
    })
```

- [ ] **Step 3: Update returnLoan service to accept condition and status params**

In `api/src/modules/loans/loans.service.ts`, update the `returnLoan` function signature and body:

```typescript
export async function returnLoan(id: string, params?: { condition?: string; copyStatus?: string }) {
  const loan = await getLoan(id)

  if (loan.status === 'RETURNED') {
    throw new BadRequestError('Loan has already been returned')
  }

  const copyCondition = params?.condition
  const copyStatus = params?.copyStatus || undefined

  return prisma.$transaction(async (tx) => {
    const updatedLoan = await tx.loan.update({
      where: { id },
      data: { status: 'RETURNED', returnedAt: new Date() },
      include: loanInclude,
    })

    // Check if any other user has a pending reservation for this book
    const pendingReservation = await tx.reservation.findFirst({
      where: { bookId: loan.bookCopy.book.id, status: 'PENDING' },
      orderBy: { reservedAt: 'asc' },
    })

    // If staff set a specific copy status, use it; otherwise default logic
    let newCopyStatus: string
    if (copyStatus && copyStatus !== 'AVAILABLE') {
      newCopyStatus = copyStatus
    } else {
      newCopyStatus = pendingReservation ? 'RESERVED' : 'AVAILABLE'
    }

    await tx.bookCopy.update({
      where: { id: loan.bookCopyId },
      data: {
        status: newCopyStatus,
        ...(copyCondition && { condition: copyCondition }),
      },
    })

    if (pendingReservation && newCopyStatus !== 'DAMAGED' && newCopyStatus !== 'RETIRED') {
      const reservationExpiry = parseInt((await getSetting('loan.reservationExpiryDays')) || '', 10) || env.RESERVATION_EXPIRY_DAYS
      await tx.reservation.update({
        where: { id: pendingReservation.id },
        data: {
          bookCopyId: loan.bookCopyId,
          expiresAt: new Date(Date.now() + reservationExpiry * 24 * 60 * 60 * 1000),
        },
      })
    }

    return parseLoan(updatedLoan)
  })
}
```

- [ ] **Step 4: Update returnLoan controller to handle body and create damage report**

In `api/src/modules/loans/loans.controller.ts`, add import at top:

```typescript
import { createDamageReport } from '../damageReports/damageReports.service'
```

Replace the `returnLoan` controller function:

```typescript
export async function returnLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const libraryId = await getLibraryIdForLoan(req.params.id as string)
    await requireStaffAccess(req.user!.id, req.user!.role, libraryId)

    const { condition, copyStatus, reportDamage, damageDescription } = req.body || {}

    // Get the loan before return to capture conditionAtCheckout
    const loanBefore = await loansService.getLoan(req.params.id as string)

    const loan = await loansService.returnLoan(req.params.id as string, { condition, copyStatus })

    // Create damage report if requested
    if (reportDamage) {
      await createDamageReport({
        loanId: loan.id,
        bookCopyId: loan.bookCopyId,
        type: 'STAFF_RETURN',
        conditionBefore: loanBefore.conditionAtCheckout || undefined,
        conditionAfter: condition || undefined,
        description: damageDescription,
      }, req.user!.id)
    }

    logAction({
      actorId: req.user!.id,
      actorName: req.user!.email,
      action: 'LOAN_RETURNED',
      targetType: 'Loan',
      targetId: loan.id,
      targetName: loan.bookCopy.book.title,
      metadata: { userId: loan.userId, bookCopyId: loan.bookCopyId, condition, copyStatus, reportDamage },
    })
    res.json(loan)
  } catch (err) {
    next(err)
  }
}
```

- [ ] **Step 5: Add validation to return route**

In `api/src/modules/loans/loans.router.ts`, update imports to include `returnLoanSchema`:

```typescript
import { createLoanSchema, loanQuerySchema, updateLoanSchema, returnLoanSchema } from './loans.schemas'
```

Update the return route (line 15):

```typescript
router.patch('/:id/return', authorizePermission('RETURN_LOANS'), validate(returnLoanSchema), controller.returnLoan)
```

- [ ] **Step 6: Update loanInclude to include conditionAtCheckout and damageReports**

In `api/src/modules/loans/loans.service.ts`, update the `loanInclude` constant:

```typescript
const loanInclude = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  issuedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  bookCopy: {
    include: {
      book: { select: { id: true, title: true, author: true, isbn: true } },
      shelf: { include: { library: { select: { id: true, name: true } } } },
    },
  },
  damageReports: {
    include: {
      reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
}
```

- [ ] **Step 7: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

---

### Task 5: Seed Data

**Files:**
- Modify: `api/prisma/seed.ts`
- Modify: `api/src/modules/setup/setup.service.ts`

- [ ] **Step 1: Seed copy.conditions setting in seed.ts**

In `api/prisma/seed.ts`, add after the existing setting upserts (or alongside them near the end before `console.log`):

```typescript
  await prisma.systemSetting.upsert({
    where: { key: 'copy.conditions' },
    create: { key: 'copy.conditions', value: JSON.stringify(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']) },
    update: {},
  })
```

Also update the loan create to include `conditionAtCheckout`:

Find the `prisma.loan.create` call and add `conditionAtCheckout: 'GOOD'` to the data.

- [ ] **Step 2: Seed copy.conditions in setup.service.ts devSeed**

In `api/src/modules/setup/setup.service.ts`, add the same upsert alongside the existing setting upserts in the devSeed function:

```typescript
  await prisma.systemSetting.upsert({
    where: { key: 'copy.conditions' },
    create: { key: 'copy.conditions', value: JSON.stringify(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']) },
    update: {},
  })
```

Also update the loan create to include `conditionAtCheckout: 'GOOD'`.

- [ ] **Step 3: Verify compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

---

### Task 6: Frontend Types & API Clients

**Files:**
- Modify: `site/src/types.ts`
- Modify: `site/src/api/loans.ts`
- Modify: `site/src/api/settings.ts`
- Create: `site/src/api/damageReports.ts`

- [ ] **Step 1: Update types**

In `site/src/types.ts`, update the `BookCopy` interface — change the `condition` field from a union to `string`:

```typescript
  condition: string
```

Update the `Loan` interface — add `conditionAtCheckout` and `damageReports`:

```typescript
export interface Loan {
  id: string
  userId: string
  user: { id: string; firstName: string; lastName: string; email: string }
  bookCopyId: string
  bookCopy: { id: string; barcode: string; book: { id: string; title: string; author: string; isbn: string }; shelf: { id: string; library: { id: string; name: string } } }
  issuedById?: string
  issuedBy?: { id: string; firstName: string; lastName: string; email: string }
  status: LoanStatus
  borrowedAt: string
  dueDate: string
  returnedAt?: string
  renewCount: number
  notes?: string
  notesEditedBy?: Array<{ id: string; name: string; at: string }>
  conditionAtCheckout?: string
  damageReports?: DamageReport[]
  createdAt: string
  updatedAt: string
}

export interface DamageReport {
  id: string
  loanId: string
  bookCopyId: string
  bookCopy?: { id: string; book: { id: string; title: string; author: string; isbn: string } }
  reportedById: string
  reportedBy: { id: string; firstName: string; lastName: string; email: string }
  type: 'STAFF_RETURN' | 'STAFF_REPORT' | 'MEMBER_REPORT'
  conditionBefore?: string
  conditionAfter?: string
  description?: string
  createdAt: string
}
```

- [ ] **Step 2: Update loans API client**

In `site/src/api/loans.ts`, update the `return` method to accept params:

```typescript
  return: (id: string, data?: { condition?: string; copyStatus?: string; reportDamage?: boolean; damageDescription?: string }) =>
    api.patch<Loan>(`/loans/${id}/return`, data).then((r) => r.data),
```

- [ ] **Step 3: Add copy.conditions to settings SettingKey**

In `site/src/api/settings.ts`, add `'copy.conditions'` to the `SettingKey` union type (after `'loan.reservationExpiryDays'`):

```typescript
  | 'copy.conditions'
```

- [ ] **Step 4: Create damage reports API client**

Create `site/src/api/damageReports.ts`:

```typescript
import { api } from './client'
import type { DamageReport, PaginatedResponse } from '../types'

export const damageReportsApi = {
  list: (params: { page?: number; limit?: number; loanId?: string; bookCopyId?: string; userId?: string } = {}) =>
    api.get<PaginatedResponse<DamageReport>>('/damage-reports', { params }).then((r) => r.data),

  get: (id: string) => api.get<DamageReport>(`/damage-reports/${id}`).then((r) => r.data),

  create: (data: { loanId: string; bookCopyId: string; type: string; conditionBefore?: string; conditionAfter?: string; description?: string }) =>
    api.post<DamageReport>('/damage-reports', data).then((r) => r.data),

  forLoan: (loanId: string) =>
    api.get<DamageReport[]>(`/damage-reports/loan/${loanId}`).then((r) => r.data),

  forUser: (userId: string) =>
    api.get<{ count: number; reports: DamageReport[] }>(`/damage-reports/user/${userId}`).then((r) => r.data),
}
```

- [ ] **Step 5: Verify site compilation**

```bash
cd site && npx tsc --noEmit
```

Expected: No errors.

---

### Task 7: Admin Settings — Book Conditions Section

**Files:**
- Modify: `site/src/pages/admin/AdminSettingsPage.tsx`

- [ ] **Step 1: Add BookConditionsSettings component**

In `site/src/pages/admin/AdminSettingsPage.tsx`, add a new component before the `FactoryResetSection` (around line 1020). Add `List` to the lucide-react imports at line 5.

```typescript
// ── Book Conditions Section ──────────────────────────────────────────────

function BookConditionsSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const [conditions, setConditions] = useState<string[]>([])
  const [newCondition, setNewCondition] = useState('')

  useEffect(() => {
    if (data) {
      const raw = data.settings['copy.conditions']
      try {
        const parsed = JSON.parse(raw || '[]')
        setConditions(Array.isArray(parsed) ? parsed : ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
      } catch {
        setConditions(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'])
      }
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => settingsApi.update({ 'copy.conditions': JSON.stringify(conditions) }),
    onSuccess: (res) => { toast.success('Conditions saved'); qc.setQueryData(['settings'], res) },
    onError: (err) => toast.error(extractError(err)),
  })

  const addCondition = () => {
    const val = newCondition.trim().toUpperCase()
    if (!val || conditions.includes(val)) return
    setConditions([...conditions, val])
    setNewCondition('')
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const arr = [...conditions]
    ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
    setConditions(arr)
  }

  const moveDown = (index: number) => {
    if (index === conditions.length - 1) return
    const arr = [...conditions]
    ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
    setConditions(arr)
  }

  if (isLoading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
          <List className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Book Conditions</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Configure the condition options available for book copies.</p>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          {conditions.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{c}</span>
              <button onClick={() => moveUp(i)} disabled={i === 0} className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </button>
              <button onClick={() => moveDown(i)} disabled={i === conditions.length - 1} className="rounded p-1 text-gray-400 hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <button onClick={() => removeCondition(i)} className="rounded p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCondition()}
            placeholder="Add condition…"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          />
          <Button variant="secondary" onClick={addCondition} disabled={!newCondition.trim()}>Add</Button>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add to SETTINGS_SECTIONS array**

In the `SETTINGS_SECTIONS` array (around line 1237), add after the `'loans'` entry:

```typescript
  { key: 'conditions', keywords: ['condition', 'book condition', 'damage', 'good', 'fair', 'poor'], component: BookConditionsSettings },
```

- [ ] **Step 3: Verify site compilation**

```bash
cd site && npx tsc --noEmit
```

Expected: No errors.

---

### Task 8: LoansPage — Return Modal & Damage Section

**Files:**
- Modify: `site/src/pages/admin/LoansPage.tsx`

- [ ] **Step 1: Add ReturnBookModal component**

In `site/src/pages/admin/LoansPage.tsx`, add imports at the top:

```typescript
import { damageReportsApi } from '../../api/damageReports'
```

Add the `ShieldAlert` icon to the lucide-react imports.

Add a new component before the `LoanDrawer` component:

```typescript
// ── Return Book Modal ────────────────────────────────────────────────────────

function ReturnBookModal({ loan, open, onClose, onSuccess }: { loan: Loan; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { data: loanConfig } = useQuery({
    queryKey: ['loan-config'],
    queryFn: () => api.get('/loans/config').then((r: any) => r.data),
  })

  const conditions: string[] = loanConfig?.conditions ?? ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']
  const [condition, setCondition] = useState(loan.bookCopy.condition || 'GOOD')
  const [copyStatus, setCopyStatus] = useState<'AVAILABLE' | 'DAMAGED' | 'RETIRED'>('AVAILABLE')
  const [reportDamage, setReportDamage] = useState(false)
  const [damageDescription, setDamageDescription] = useState('')

  const returnMutation = useMutation({
    mutationFn: () => loansApi.return(loan.id, { condition, copyStatus, reportDamage, damageDescription: reportDamage ? damageDescription : undefined }),
    onSuccess: () => { toast.success('Book returned'); onSuccess() },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Return Book" size="md">
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{loan.bookCopy.book.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{loan.bookCopy.barcode} · {loan.user.firstName} {loan.user.lastName}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Condition</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {loan.conditionAtCheckout && condition !== loan.conditionAtCheckout && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Was {loan.conditionAtCheckout} at checkout</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Copy Status</label>
          <select value={copyStatus} onChange={(e) => setCopyStatus(e.target.value as any)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
            <option value="AVAILABLE">Available</option>
            <option value="DAMAGED">Damaged</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="reportDamage" checked={reportDamage} onChange={(e) => setReportDamage(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="reportDamage" className="text-sm font-medium text-gray-700 dark:text-gray-300">Report damage against member</label>
        </div>

        {reportDamage && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Damage Description</label>
            <textarea
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              rows={3}
              placeholder="Describe the damage..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => returnMutation.mutate()} loading={returnMutation.isPending}>Confirm Return</Button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Update LoanDrawer — replace direct return with modal, add damage section, add report damage button**

In the `LoanDrawer` component:

1. Add state for the return modal: `const [returnOpen, setReturnOpen] = useState(false)`

2. Replace the Return button (`returnMutation` usage) to open the modal instead. Remove the `returnMutation` from the drawer. Change the Return button to:

```typescript
<Button size="sm" onClick={() => setReturnOpen(true)}>
  <CheckCircle className="h-4 w-4" /> Return
</Button>
```

3. Add a "Report Damage" button in the actions section (after Return button, for ACTIVE/OVERDUE loans):

```typescript
const reportDamageMutation = useMutation({
  mutationFn: (description: string) => damageReportsApi.create({
    loanId: loan.id,
    bookCopyId: loan.bookCopyId,
    type: 'STAFF_REPORT',
    description,
  }),
  onSuccess: () => { toast.success('Damage reported'); qc.invalidateQueries({ queryKey: ['loans'] }) },
  onError: (err) => toast.error(extractError(err)),
})
```

Add state: `const [reportDamageOpen, setReportDamageOpen] = useState(false)` and `const [damageDesc, setDamageDesc] = useState('')`

Add button in actions:

```typescript
<Button size="sm" variant="secondary" onClick={() => setReportDamageOpen(!reportDamageOpen)}>
  <ShieldAlert className="h-4 w-4" /> Report Damage
</Button>
{reportDamageOpen && (
  <div className="w-full space-y-2">
    <textarea
      value={damageDesc}
      onChange={(e) => setDamageDesc(e.target.value)}
      rows={2}
      placeholder="Describe the damage..."
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
    />
    <Button size="sm" onClick={() => { reportDamageMutation.mutate(damageDesc); setReportDamageOpen(false); setDamageDesc('') }}
      loading={reportDamageMutation.isPending} disabled={!damageDesc.trim()}>
      Submit Report
    </Button>
  </div>
)}
```

4. Add damage reports section in the drawer (after overdue warning, before staff notes):

```typescript
{/* Damage Reports */}
{loan.damageReports && loan.damageReports.length > 0 && (
  <div>
    <p className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Damage Reports</p>
    <div className="space-y-2">
      {loan.damageReports.map((dr) => (
        <div key={dr.id} className={`rounded-lg border p-3 ${dr.type === 'MEMBER_REPORT' ? 'border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/20' : 'border-red-200 bg-red-50 dark:border-red-700/50 dark:bg-red-900/20'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${dr.type === 'MEMBER_REPORT' ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}>
              {dr.type === 'MEMBER_REPORT' ? 'Member Report' : dr.type === 'STAFF_RETURN' ? 'Return Report' : 'Staff Report'}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(dr.createdAt).toLocaleDateString()}</span>
          </div>
          <button onClick={() => navigate(`/manage/users?search=${encodeURIComponent(dr.reportedBy.email)}`)}
            className="text-xs text-blue-600 hover:underline dark:text-blue-400">
            {dr.reportedBy.firstName} {dr.reportedBy.lastName}
          </button>
          {dr.conditionBefore && dr.conditionAfter && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{dr.conditionBefore} → {dr.conditionAfter}</p>
          )}
          {dr.description && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{dr.description}</p>}
        </div>
      ))}
    </div>
  </div>
)}
```

5. Add the ReturnBookModal at the bottom of the drawer JSX (inside the root div, after the main content):

```typescript
{returnOpen && <ReturnBookModal loan={loan} open={returnOpen} onClose={() => setReturnOpen(false)} onSuccess={onClose} />}
```

- [ ] **Step 3: Add warning icons to loan table rows**

In the loans table `tbody`, update the book title cell to show a warning icon when the loan has damage reports:

```typescript
<td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
  <span className="flex items-center gap-1.5">
    {loan.damageReports && loan.damageReports.length > 0 && (
      <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 ${loan.damageReports.some((d) => d.type !== 'MEMBER_REPORT') ? 'text-red-500' : 'text-amber-500'}`} />
    )}
    {loan.bookCopy.book.title}
  </span>
</td>
```

- [ ] **Step 4: Verify site compilation**

```bash
cd site && npx tsc --noEmit
```

Expected: No errors.

---

### Task 9: Member Dashboard — Condition Display & Report Damage

**Files:**
- Modify: `site/src/pages/member/DashboardPage.tsx`

- [ ] **Step 1: Add condition column and report damage button to active loans table**

In `site/src/pages/member/DashboardPage.tsx`, add imports:

```typescript
import { damageReportsApi } from '../../api/damageReports'
import { ShieldAlert } from 'lucide-react'
```

Add state for the report damage modal:

```typescript
const [reportLoan, setReportLoan] = useState<Loan | null>(null)
const [damageDesc, setDamageDesc] = useState('')

const reportDamage = useMutation({
  mutationFn: () => damageReportsApi.create({
    loanId: reportLoan!.id,
    bookCopyId: reportLoan!.bookCopyId,
    type: 'MEMBER_REPORT',
    description: damageDesc,
  }),
  onSuccess: () => { toast.success('Damage reported — staff will review'); setReportLoan(null); setDamageDesc(''); qc.invalidateQueries({ queryKey: ['loans'] }) },
  onError: (err) => toast.error(extractError(err)),
})
```

Update the active loans table header to add a "Condition" column (after "Book"):

```typescript
<th className="px-4 py-3 text-left">Condition</th>
```

Add condition cell in the table body (after the book title cell):

```typescript
<td className="px-4 py-3 text-gray-500 dark:text-gray-400">{loan.conditionAtCheckout || '—'}</td>
```

Replace the Action column content — add Report Damage button alongside Extend:

```typescript
<td className="px-4 py-3 text-right">
  <div className="flex items-center justify-end gap-2">
    <button onClick={() => setReportLoan(loan)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-amber-500 dark:hover:bg-gray-700" title="Report damage">
      <ShieldAlert className="h-4 w-4" />
    </button>
    <Button size="sm" variant="secondary" onClick={() => renew.mutate(loan.id)} loading={renew.isPending} disabled={loan.renewCount >= maxRenewals}>
      {loan.renewCount >= maxRenewals ? 'Limit reached' : 'Extend'}
    </Button>
  </div>
</td>
```

Add the report damage modal at the bottom (before the closing section tag or similar):

```typescript
{reportLoan && (
  <Modal open={!!reportLoan} onClose={() => { setReportLoan(null); setDamageDesc('') }} title="Report Damage" size="sm">
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Report damage to <span className="font-medium text-gray-900 dark:text-white">{reportLoan.bookCopy.book.title}</span>. Staff will review when the book is returned.
      </p>
      <textarea
        value={damageDesc}
        onChange={(e) => setDamageDesc(e.target.value)}
        rows={3}
        placeholder="Describe what happened..."
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => { setReportLoan(null); setDamageDesc('') }}>Cancel</Button>
        <Button onClick={() => reportDamage.mutate()} loading={reportDamage.isPending} disabled={!damageDesc.trim()}>
          Submit Report
        </Button>
      </div>
    </div>
  </Modal>
)}
```

- [ ] **Step 2: Verify site compilation**

```bash
cd site && npx tsc --noEmit
```

Expected: No errors.

---

### Task 10: UsersPage — Damage Warning

**Files:**
- Modify: `site/src/pages/admin/UsersPage.tsx`

- [ ] **Step 1: Add damage warning to ManageUserDrawer**

In `site/src/pages/admin/UsersPage.tsx`, add import:

```typescript
import { damageReportsApi } from '../../api/damageReports'
import { ShieldAlert, ChevronDown } from 'lucide-react'
```

In the `ManageUserDrawer` component, add a query for damage info:

```typescript
const { data: damageInfo } = useQuery({
  queryKey: ['users', user.id, 'damage'],
  queryFn: () => damageReportsApi.forUser(user.id),
})

const [damageExpanded, setDamageExpanded] = useState(false)
```

Add a warning banner right after the header div (the one with avatar/name), before the tabs. Inside the drawer content, before the tabs row:

```typescript
{damageInfo && damageInfo.count > 0 && (
  <div className="border-b border-gray-200 px-6 py-3 dark:border-gray-700">
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-700/50 dark:bg-red-900/20">
      <button onClick={() => setDamageExpanded(!damageExpanded)} className="flex w-full items-center gap-2">
        <ShieldAlert className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
        <span className="flex-1 text-left text-sm font-medium text-red-700 dark:text-red-300">
          {damageInfo.count} damage report{damageInfo.count !== 1 ? 's' : ''} on record
        </span>
        <ChevronDown className={`h-4 w-4 text-red-400 transition-transform ${damageExpanded ? 'rotate-180' : ''}`} />
      </button>
      {damageExpanded && (
        <div className="mt-3 space-y-2 border-t border-red-200 pt-3 dark:border-red-700/50">
          {damageInfo.reports.map((dr) => (
            <div key={dr.id} className="text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white">{dr.bookCopy?.book.title}</span>
                <span className="text-gray-400">{new Date(dr.createdAt).toLocaleDateString()}</span>
              </div>
              {dr.conditionBefore && dr.conditionAfter && (
                <p className="text-gray-500 dark:text-gray-400">{dr.conditionBefore} → {dr.conditionAfter}</p>
              )}
              {dr.description && <p className="text-gray-600 dark:text-gray-300">{dr.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 2: Add damage icon to user table rows**

In the users table, find where user names are rendered in table rows. Add a damage count query at the page level for all displayed users, or simpler: show the icon based on a new field.

The simpler approach: add the `ShieldAlert` icon next to the user name in the table. Since we don't have per-row damage counts loaded in the list view, we'll add a lightweight endpoint or simply skip the table icon for now and rely on the drawer warning.

Actually, the cleanest approach: add `_damageCount` to the user list API response. But that's a bigger change. For now, the drawer warning is sufficient — staff will see it when they click on a user. This matches the spec's intent (warning before taking action on a user).

- [ ] **Step 3: Verify site compilation**

```bash
cd site && npx tsc --noEmit
```

Expected: No errors.

---

### Task 11: ManageBooksPage — Dynamic Conditions

**Files:**
- Modify: `site/src/pages/admin/ManageBooksPage.tsx`

- [ ] **Step 1: Replace hardcoded condition dropdown with dynamic conditions**

In `site/src/pages/admin/ManageBooksPage.tsx`, add a query for loan config to get conditions:

```typescript
const { data: loanConfig } = useQuery({
  queryKey: ['loan-config'],
  queryFn: () => api.get('/loans/config').then((r: any) => r.data),
})

const conditions: string[] = loanConfig?.conditions ?? ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']
```

Replace the hardcoded condition dropdown (around line 385-388):

```typescript
{['GOOD', 'FAIR', 'POOR'].map((c) => <option key={c} value={c}>{c}</option>)}
```

With:

```typescript
{conditions.map((c) => <option key={c} value={c}>{c}</option>)}
```

Also add import for `api` from `../../api/client` if not already imported.

- [ ] **Step 2: Verify site compilation**

```bash
cd site && npx tsc --noEmit
```

Expected: No errors.

---

### Task 12: Build, Test & Verify

- [ ] **Step 1: Run full API type check**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 2: Run full site type check**

```bash
cd site && npx tsc --noEmit
```

- [ ] **Step 3: Rebuild and restart Docker**

```bash
cd /home/olly/Development/VisualCode/libraryPortal && docker compose down && docker compose up --build -d
```

- [ ] **Step 4: Verify API health**

```bash
docker compose logs -f api 2>&1 | head -30
```

Expected: API starts, migrations applied, no errors.

- [ ] **Step 5: Update api.md documentation**

Add the new damage reports endpoints to `api/api.md`:

```markdown
### Damage Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/damage-reports` | Staff | List damage reports (filterable by loanId, bookCopyId, userId) |
| GET | `/damage-reports/:id` | Staff | Get single damage report |
| POST | `/damage-reports` | Auth | Create damage report (MEMBER_REPORT: loan owner only) |
| GET | `/damage-reports/loan/:loanId` | Auth | Get damage reports for a loan |
| GET | `/damage-reports/user/:userId` | Staff | Get damage info for a user |
```

Document the updated return endpoint body and the `copy.conditions` setting.

- [ ] **Step 6: Update site/plan.md**

Add damage reporting to the relevant pages documentation.
