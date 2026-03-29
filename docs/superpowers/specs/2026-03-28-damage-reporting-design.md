# Damage Reporting & Dynamic Conditions

## Overview

Add a damage reporting system to the library portal: configurable book conditions, a return flow that captures condition + damage, member and staff damage reporting mid-loan, and damage history visible on users and loans.

## Database

### New Model: DamageReport

```prisma
model DamageReport {
  id              String   @id @default(uuid())
  loanId          String
  loan            Loan     @relation(fields: [loanId], references: [id])
  bookCopyId      String
  bookCopy        BookCopy @relation(fields: [bookCopyId], references: [id])
  reportedById    String
  reportedBy      User     @relation(fields: [reportedById], references: [id])
  type            String   // STAFF_RETURN | STAFF_REPORT | MEMBER_REPORT
  conditionBefore String?  // copy condition at time of checkout (STAFF_RETURN only)
  conditionAfter  String?  // condition set at return (STAFF_RETURN only)
  description     String?  // free text damage notes
  createdAt       DateTime @default(now())
}
```

**Report types:**

- `STAFF_RETURN` — filed during the return flow when staff checks "Report Damage" and sets condition/status
- `STAFF_REPORT` — filed via "Report Damage" button in the loan drawer (mid-loan, not at return)
- `MEMBER_REPORT` — filed by the member from their dashboard; informational only, no condition changes

### Loan Model Changes

Add a `conditionAtCheckout` field to `Loan` to record what condition the copy was in when lent out. This is stored at loan creation time so the return flow can show staff the before/after.

```prisma
// Add to Loan model
conditionAtCheckout String?
```

### Relations

- `Loan` gets `damageReports DamageReport[]`
- `BookCopy` gets `damageReports DamageReport[]`
- `User` gets `damageReports DamageReport[]` (as reporter)

## Dynamic Conditions

### Setting

- Key: `copy.conditions`
- Value: JSON string array, e.g. `'["NEW","GOOD","FAIR","POOR","DAMAGED"]'`
- Seeded with `["NEW","GOOD","FAIR","POOR","DAMAGED"]` on setup

### Admin UI

New section in `/admin/settings` — **"Book Conditions"**:

- List editor showing current conditions in order
- Add new condition (text input + add button)
- Remove condition (with warning if any copies currently use it)
- Reorder via up/down buttons

### Validation Changes

- Remove hardcoded `Condition = z.enum(['GOOD', 'FAIR', 'POOR'])` from `bookCopies.schemas.ts`
- Replace with dynamic validation: API reads `copy.conditions` setting and validates against it
- All condition dropdowns (copy creation, copy edit, return flow) fetch the conditions list from the API

### Migration Path

Existing copies with `GOOD`, `FAIR`, or `POOR` conditions remain valid since those values are in the default seeded list.

## Return Flow

### Current Behavior

Staff clicks "Return" button → loan is immediately returned, copy set to `AVAILABLE`.

### New Behavior

Staff clicks "Return" → **Return Book modal** opens:

1. **Condition dropdown** — populated from `copy.conditions` setting, pre-selected to the copy's current condition
2. **Status dropdown** — options: `AVAILABLE`, `DAMAGED`, `RETIRED`. Pre-selected to `AVAILABLE`. These are hardcoded operational states, not configurable.
3. **"Report Damage" checkbox** — when checked, expands:
   - Description textarea ("Describe the damage...")
4. **Confirm Return button** — processes:
   - Returns the loan (sets `RETURNED`, `returnedAt`)
   - Updates copy condition to selected value
   - Updates copy status to selected value
   - If damage checkbox checked: creates `DamageReport` with `type: STAFF_RETURN`, `conditionBefore` (from `loan.conditionAtCheckout`), `conditionAfter` (selected condition), description

## Report Damage Button (Mid-Loan)

### Staff — Loan Drawer

- "Report Damage" button in the actions section, available when loan status is `ACTIVE` or `OVERDUE`
- Opens a modal with:
  - Description textarea (required)
  - Submit button
- Creates `DamageReport` with `type: STAFF_REPORT`

### Member — Dashboard

- "Report Damage" button on each active loan row
- Opens a modal with:
  - Description textarea (required)
  - Submit button
- Creates `DamageReport` with `type: MEMBER_REPORT`

## API Endpoints

### Damage Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/damage-reports` | Staff or loan owner | Create a damage report |
| GET | `/damage-reports` | Staff | List reports, filterable by `loanId`, `bookCopyId`, `userId` |
| GET | `/damage-reports/:id` | Staff | Get single report |

**POST body:**
```json
{
  "loanId": "uuid",
  "bookCopyId": "uuid",
  "type": "STAFF_RETURN | STAFF_REPORT | MEMBER_REPORT",
  "conditionBefore": "GOOD",     // optional, STAFF_RETURN only
  "conditionAfter": "POOR",      // optional, STAFF_RETURN only
  "description": "Page 42 torn"  // required for STAFF_REPORT and MEMBER_REPORT
}
```

**Authorization:**
- `STAFF_RETURN` and `STAFF_REPORT`: staff only (LIBRARIAN/ADMIN or library staff)
- `MEMBER_REPORT`: loan owner only (the member who has the book)

### Modified Endpoints

**PATCH `/loans/:id/return`** — updated to accept:
```json
{
  "condition": "FAIR",
  "copyStatus": "AVAILABLE",
  "reportDamage": false,
  "damageDescription": "..."
}
```

**GET `/loans/config`** — add `conditions` array to the response (from `copy.conditions` setting)

## UI Changes

### Loan Drawer — Damage Section

If a loan has any `DamageReport` records, show a section below the details card:

- Section header: "Damage Reports"
- Each report as a compact card:
  - Type badge: `Member Report` (amber), `Staff Report` (red), `Return Report` (red)
  - Reporter name (clickable link to `/manage/users?search=<email>`)
  - Date
  - Description text
  - For `STAFF_RETURN`: condition change shown (e.g. "GOOD → POOR")

### Loan Table — Warning Icon

Loans with any damage reports show a small warning icon (amber for member reports only, red if any staff reports) next to the book title in the loans table.

### `/manage/users` — Damage Warning

**Table:** Users with `STAFF_RETURN` or `STAFF_REPORT` damage reports get a small warning icon next to their name.

**User drawer:** If user has any staff-filed damage reports:
- Warning banner at top: "This user has N damage report(s) on record"
- Expandable list: book title, date, condition change (if STAFF_RETURN), description

Only `STAFF_RETURN` and `STAFF_REPORT` types count toward the user warning. Member self-reports do not flag the user.

### Member Dashboard

- Active loans show the copy's condition at checkout (e.g. "Condition: GOOD") — this is the only place members see condition info
- "Report Damage" button on each active loan
- Members never see conditions in book listings, book detail pages, or copy lists
- Members never see `RETIRED` copies anywhere
- Members can see `DAMAGED` status copies in book detail (they just can't borrow them)

### Admin Settings — Book Conditions Section

New section in `/admin/settings`:
- Icon: list/tag icon
- Title: "Book Conditions"
- Description: "Configure the condition options available for book copies"
- List of current conditions with remove buttons
- Text input + add button to add new conditions
- Reorder controls

## Visibility Rules Summary

| Data | Members | Staff |
|------|---------|-------|
| Copy condition in book listings | Hidden | Visible |
| Copy condition on active loan | Visible (their own loans only) | Visible |
| Retired copies | Hidden everywhere | Visible |
| Damaged copies in book detail | Visible (can't borrow) | Visible |
| Damage reports on loans | See own member reports only | See all reports |
| Damage history on users | N/A | Full history in user drawer |
| Damage warning badge on users | N/A | Visible in users table |

## Seed Data

- Seed `copy.conditions` setting with `["NEW","GOOD","FAIR","POOR","DAMAGED"]`
- Add to both `prisma/seed.ts` and `setup.service.ts` devSeed
- Optionally seed a sample damage report on the existing overdue loan for testing
