# Library Portal — API Reference

## Stack

- **Runtime:** Node.js + TypeScript (compiled via `tsc`, served with `tsx` in dev)
- **Framework:** Express 4
- **ORM:** Prisma 5 with SQLite
- **Auth:** JWT — short-lived access token (15 min) + refresh token (7 days, stored in DB)
- **Validation:** Zod (schemas mirror frontend schemas)
- **Password hashing:** bcryptjs

## Start Commands

```bash
cd api
npm run dev        # tsx watch — hot reload, http://localhost:3000
npm run build      # compile TypeScript → dist/
npm run start      # node dist/index.js (production)
npm run db:migrate # run pending Prisma migrations
npm run db:seed    # seed dev accounts + sample data
npm run db:studio  # Prisma Studio GUI at http://localhost:5555
npm run db:reset   # drop + re-migrate + seed (destructive)
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✓ | — | SQLite path, e.g. `file:./dev.db` |
| `JWT_ACCESS_SECRET` | ✓ | — | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | ✓ | — | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | — | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | — | `7d` | Refresh token lifetime |
| `CORS_ORIGIN` | — | `http://localhost:5173` | Allowed CORS origin |
| `PORT` | — | `3000` | Server port |

---

## Setup Wizard

First-run setup flow. All `/api/setup/*` endpoints return `403 { code: "SETUP_COMPLETE" }` once setup has been finalised.

### `GET /api/setup/status`
Public. Returns whether the system needs initial setup.
```json
{ "needsSetup": true }
```
`needsSetup` is `true` when there are zero users with role `ADMIN` in the database.

### `POST /api/setup/generate-code`
Public (only when `needsSetup`). Generates a random 6-digit setup code, stores it in memory (expires after 10 minutes), and **prints it to the server console/logs**. Returns:
```json
{ "message": "Setup code has been printed to the server console." }
```
Only one active code exists at a time; calling again replaces the previous code.

### `POST /api/setup/verify-code`
Public (only when `needsSetup`). Validates the code entered by the user.
```json
{ "code": "123456" }
```
On success, returns a short-lived setup token (15 min JWT):
```json
{ "setupToken": "eyJ..." }
```
The code is single-use — consumed on successful verification. On failure returns `401 { code: "INVALID_CODE" }`.

### `POST /api/setup/admin`
Requires: `X-Setup-Token` header with a valid setup token (from verify-code).
Creates the first admin user account.
```json
{ "email": "...", "password": "...", "firstName": "...", "lastName": "..." }
```
Returns the same shape as `POST /api/auth/register`:
```json
{ "user": { ... }, "accessToken": "...", "refreshToken": "..." }
```
The user is created with role `ADMIN`. After this, subsequent steps use normal Bearer auth.

### `POST /api/setup/complete`
Requires: Bearer token (ADMIN role).
Sets `setup.completed = "true"` in SystemSettings, locking out all setup endpoints permanently.
```json
{ "message": "Setup complete." }
```

### `POST /api/setup/factory-reset`
Requires: Bearer token (ADMIN role).
Deletes all data from every table (users, books, libraries, loans, groups, settings, audit logs, etc.) and resets the system to a fresh state. After this call, `GET /api/setup/status` will return `needsSetup: true`.
```json
{ "message": "Factory reset complete. System is ready for setup." }
```

---

## Backups

Database backup system with automatic daily backups, pre-deletion backups, and restore via security key verification.

### Storage

Backups are SQLite `.db` file copies stored in `/app/data/backups/` (Docker) or `api/backups/` (dev). Each backup file is named `backup-{timestamp}.db` with metadata stored in a `backups.json` index file alongside.

### Routes

#### `GET /api/backups`
Requires: ADMIN role.
Returns list of all backups with metadata.
```json
{
  "backups": [
    {
      "id": "abc123",
      "filename": "backup-2026-03-28T20-15-00.db",
      "size": 1048576,
      "reason": "scheduled" | "pre-delete" | "manual",
      "note": "Daily backup" | "Before deleting Central Library" | "Manual backup",
      "createdAt": "2026-03-28T20:15:00.000Z"
    }
  ]
}
```

#### `POST /api/backups`
Requires: ADMIN role.
Creates a manual backup.
```json
// Request (optional)
{ "note": "Before major changes" }
// Response
{ "id": "abc123", "filename": "backup-...", "size": 1048576, "reason": "manual", "createdAt": "..." }
```

#### `DELETE /api/backups/:id`
Requires: ADMIN role.
Deletes a specific backup file.

#### `POST /api/backups/:id/restore`
Requires: ADMIN role + security key (WebAuthn) verification.
Restores the database from a backup. This is destructive — replaces current data.

**Flow:**
1. Frontend calls `POST /api/backups/:id/restore` with `{ step: 'challenge' }`
2. API returns WebAuthn authentication options (challenge)
3. User authenticates with security key
4. Frontend calls again with `{ step: 'verify', credential: {...} }`
5. API verifies the security key, then performs the restore
6. On success, all sessions are invalidated — user must re-login

If the user has no security keys registered, falls back to requiring a confirmation code printed in the API's docker-compose logs (similar to setup wizard code).

#### `GET /api/backups/:id/download`
Requires: ADMIN role.
Downloads the raw backup `.db` file.

### Automatic Backups

- **Daily**: A cron job (node-cron) runs at 02:00 AM server time, creates a backup with reason `scheduled`
- **Pre-delete**: Before a library hard-delete or factory reset, a backup is automatically created with reason `pre-delete`
- **Retention**: Scheduled backups older than 30 days are auto-pruned (keeps minimum 5). Manual and pre-delete backups are never auto-pruned.

### Frontend

Page at `/admin/backups`:
- List all backups (date, size, reason, note)
- "Create Backup" button
- Download button per backup
- Restore button per backup (triggers security key flow or console code)
- Delete button per backup

---

## Auth

### Registration Settings

Registration is controlled by `SystemSetting` keys, configurable in `/admin/settings`:

| Setting Key | Values | Default | Description |
|---|---|---|---|
| `reg.mode` | `open` / `domain` / `token` / `disabled` | `open` | Who can register |
| `reg.allowedDomain` | string (e.g. `company.com`) | — | When mode=`domain`, only emails matching this domain can register |
| `reg.token` | string (auto-generated UUID) | — | When mode=`token`, registration requires this token in `registrationToken` field |
| `reg.requireApproval` | `true` / `false` | `false` | When `true`, new accounts are created with `isActive: false` and must be activated by an admin |
| `reg.requireEmailConfirmation` | `true` / `false` | `false` | When `true`, a 6-digit code is emailed (or logged to console) and must be verified before the account is activated |

The register endpoint enforces these rules:
- **`disabled`**: returns 403
- **`domain`**: checks email domain matches `reg.allowedDomain`
- **`token`**: checks `registrationToken` field matches `reg.token`
- **`open`**: no restrictions
- If `reg.requireApproval` is true, user is created with `isActive: false` and a `deactivationReason` of "Awaiting approval"
- If `reg.requireEmailConfirmation` is true, a 6-digit code is generated, stored in `EmailVerification` table, and sent via email/console. The user must call `POST /api/auth/verify-email` before they can log in.

### `POST /api/auth/register`
Register a new member account. Accepts optional `registrationToken` when mode is `token`.
```json
{ "email": "...", "password": "...", "firstName": "...", "lastName": "...", "registrationToken": "..." }
```
Returns: `{ accessToken, refreshToken, user }` (or `{ user, pendingEmailVerification: true }` if email confirmation required, or `{ user, pendingApproval: true }` if approval required)

### `POST /api/auth/verify-email`
Public. Verifies the email confirmation code sent during registration.
```json
{ "email": "...", "code": "123456" }
```
On success, marks the user's email as verified. If `reg.requireApproval` is also on, the user still needs admin activation.
Returns: `{ message: "Email verified." }` or `{ message: "Email verified. Your account is pending approval." }`

### `POST /api/auth/login`
```json
{ "email": "...", "password": "..." }
```
Returns: `{ accessToken, refreshToken, user }`

### `POST /api/auth/refresh`
```json
{ "refreshToken": "..." }
```
Returns: `{ accessToken, refreshToken }`

### `POST /api/auth/logout`
Requires: Bearer token
```json
{ "refreshToken": "..." }
```
Revokes the given refresh token.

### `GET /api/auth/me`
Requires: Bearer token
Returns the current user object.

### `POST /api/auth/forgot-password`
Public. Sends a password reset email if the email exists (always returns success to prevent enumeration).
```json
{ "email": "..." }
```
Returns: `{ message: "..." }`
If SMTP is not configured, the reset link is logged to the console.

### `POST /api/auth/reset-password`
Public. Resets password using a valid reset token.
```json
{ "token": "...", "password": "..." }
```
Invalidates the token and revokes all sessions for the user.
Returns: `{ message: "..." }`

---

## Settings

### `GET /api/settings`
Requires: authentication
Returns all system settings as a flat key→value object.
Keys: `smtp.enabled`, `smtp.host`, `smtp.port`, `smtp.user`, `smtp.pass`, `smtp.from`, `app.baseUrl`

### `PATCH /api/settings`
Requires: ADMIN role
Updates one or more settings.
```json
{ "smtp.enabled": "true", "smtp.host": "smtp.example.com", "smtp.port": "587", ... }
```
Returns the updated settings object.

---

## Users

All routes require authentication. Read operations require `VIEW_USERS`; write operations require `MANAGE_USERS`. Deleting a user requires the ADMIN role. A user cannot change their own role (enforced at the service layer). Role assignment is rank-gated: a caller can only manage users whose role rank is lower than their own, and can only assign roles of lower rank than their own (based on group `order`).

### `GET /api/users`
Query: `?page=1&limit=20&search=&role=MEMBER&isActive=true`
Returns: `PaginatedResponse<User>`

### `POST /api/users`
Requires: `MANAGE_USERS`
```json
{ "email": "...", "password": "...", "firstName": "...", "lastName": "...", "role": "MEMBER" }
```

### `GET /api/users/:id`
Requires: `MANAGE_USERS`

### `PATCH /api/users/:id`
Requires: `MANAGE_USERS`
```json
{ "firstName": "...", "lastName": "...", "role": "LIBRARIAN", "isActive": true }
```

### `DELETE /api/users/:id`
Requires: ADMIN role

### `PATCH /api/users/:id/active`
Requires: `MANAGE_USERS`
```json
{ "isActive": false, "reason": "Violation of terms" }
```
Deactivates or reactivates the user. `reason` is stored on the user record — required when deactivating, optional when activating (e.g. "Approved by admin").

### `POST /api/users/:id/revoke-sessions`
Requires: `MANAGE_USERS`
Revokes all refresh tokens for the user, forcing them to log in again.

### `POST /api/users/:id/reset-password`
Requires: `RESET_USER_PASSWORD`
Generates a secure temporary password, updates the user's password hash, and revokes all sessions.
Returns: `{ temporaryPassword: "Xxxx-1234" }`

### `DELETE /api/users/:id`
Requires: ADMIN role

### `GET /api/users/:id/loans`
Returns all loans for the given user.

### `GET /api/users/:id/reservations`
Returns all reservations for the given user.

### `GET /api/users/:id/audit`
Requires: `VIEW_USERS`
Returns paginated audit log entries where actor = user OR (targetType = "User" AND targetId = user.id).

---

## Audit Log

All routes require authentication.

### `GET /api/audit`
Requires: `VIEW_AUDIT_LOG`
Query: `?page=1&limit=50&actorId=&action=&targetType=&targetId=`
Returns: `PaginatedResponse<AuditLog>`

AuditLog shape:
```json
{
  "id": "...",
  "actorId": "...",
  "actorName": "user@example.com",
  "action": "USER_DEACTIVATED",
  "targetType": "User",
  "targetId": "...",
  "targetName": "Jane Smith",
  "metadata": "{\"reason\":\"...\"}",
  "createdAt": "..."
}
```

Logged actions: `USER_REGISTERED`, `USER_LOGIN`, `USER_CREATED`, `USER_ACTIVATED`, `USER_DEACTIVATED`, `USER_DELETED`, `USER_ROLE_CHANGED`, `USER_SESSIONS_REVOKED`, `USER_PASSWORD_RESET`, `BOOK_CREATED`, `BOOK_UPDATED`, `BOOK_DELETED`.

---

## Membership Types

Membership types define the kinds of access a user can have to a library. Managed in `/admin`.

### Schema: `MembershipType`
| Field | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | string (unique) | Machine name, e.g. `PERMANENT`, `MONTHLY`, `STAFF` |
| `label` | string | Display name, e.g. "Permanent", "Monthly", "Staff" |
| `durationDays` | int? | Auto-calculated end date when assigning. `null` = no expiry (permanent). |
| `isStaff` | boolean | If `true`, grants the holder library management access (shelves, copies, loans, etc.) |
| `isBuiltIn` | boolean | Built-in types cannot be deleted |
| `order` | int | Display order |

**Built-in types** (created at setup/migration):

| Name | Label | Duration | Staff | Description |
|---|---|---|---|---|
| `STAFF` | Staff | — | ✓ | Grants management access to the library. Always fixed (no auto-expiry). |
| `PERMANENT` | Permanent | — | ✗ | No expiry |
| `MONTHLY` | Monthly | 30 | ✗ | Auto-sets endDate to +30 days |
| `YEARLY` | Yearly | 365 | ✗ | Auto-sets endDate to +365 days |
| `FIXED` | Fixed Term | — | ✗ | Admin manually sets endDate |

**Staff access model:** Librarians (and custom roles with `MANAGE_*` permissions) can only perform library management actions on libraries where they hold an **active Staff membership**. ADMINs bypass this check entirely. This applies to: managing shelves, copies, loans, reservations, and memberships scoped to a library.

### `GET /api/membership-types`
Public (for dropdowns). Returns all types ordered by `order`.
```json
[{ "id": "...", "name": "PERMANENT", "label": "Permanent", "durationDays": null, "isStaff": false, "isBuiltIn": true, "order": 1 }]
```

### `POST /api/membership-types`
Requires: ADMIN role.
```json
{ "name": "WEEKLY", "label": "Weekly", "durationDays": 7 }
```
`name` must match `^[A-Z][A-Z0-9_]*$`. Cannot duplicate a built-in name.

### `PATCH /api/membership-types/:id`
Requires: ADMIN role.
```json
{ "label": "Bi-Weekly", "durationDays": 14 }
```
Cannot change `name` or `isStaff` on built-in types.

### `DELETE /api/membership-types/:id`
Requires: ADMIN role. Cannot delete built-in types. Fails if any memberships reference it.

### `POST /api/membership-types/reorder`
Requires: ADMIN role.
```json
{ "ids": ["uuid1", "uuid2", ...] }
```

---

## Libraries

GET routes use optional authentication. Access is governed by two layers:
1. **`isPrivate` flag** — private libraries are never shown to users without an active membership.
2. **`VIEW_LIBRARIES` permission** — if a role has this permission (default: `true` for MEMBER and LIBRARIAN), the user sees all public libraries plus their memberships. If set to `false`, the user sees only libraries they hold an active membership to, regardless of the library's public/private setting.

**Library management access:** Write operations on library-scoped resources (shelves, copies, loans, memberships) require the caller to hold an active **Staff** membership to that library. ADMINs are exempt. This is enforced at the service layer, not middleware — the caller's Staff memberships are checked against the target library.

### `GET /api/libraries`
Query: `?page=1&limit=20&search=`
Returns: `PaginatedResponse<Library>` (filtered by access)

### `GET /api/libraries/:id`
Returns library + throws 403 if private and caller lacks access.

### `GET /api/libraries/:id/shelves`
Returns shelves for the library (access-filtered).

### `POST /api/libraries`
Requires: `MANAGE_LIBRARIES`
```json
{ "name": "...", "labelPrefix": "CEN", "email": "...", "isPrivate": true }
```

### `PATCH /api/libraries/:id`
Requires: `MANAGE_LIBRARIES`

### `DELETE /api/libraries/:id`
Requires: ADMIN role

---

## Library Memberships

### `GET /api/libraries/:libraryId/memberships`
Requires: `MANAGE_MEMBERSHIPS`
Returns all memberships for the library.

### `GET /api/libraries/:libraryId/memberships/me`
Requires: authenticated
Returns the current user's active membership for this library, or `null`.

### `POST /api/libraries/:libraryId/memberships`
Requires: `MANAGE_MEMBERSHIPS`
```json
{ "userId": "...", "membershipType": "PERMANENT", "endDate": "...", "notes": "..." }
```
`membershipType` references a `MembershipType.name`. If the type has `durationDays` set, `endDate` is auto-calculated from today (can be overridden). Staff memberships always have `isStaff: true` resolved from the type.
If a revoked membership already exists for this user+library, it is reactivated instead of creating a new record.

### `PATCH /api/libraries/:libraryId/memberships/:userId`
Requires: `MANAGE_MEMBERSHIPS`
```json
{ "isActive": false, "endDate": "...", "notes": "..." }
```

### `DELETE /api/libraries/:libraryId/memberships/:userId`
Requires: `MANAGE_MEMBERSHIPS`

---

## Shelves

GET routes use optional authentication. Access is filtered by the same `VIEW_LIBRARIES` permission as libraries — if the caller lacks it, only shelves from libraries they hold an active membership to are returned.

### `GET /api/shelves`
Query: `?page=1&limit=20&libraryId=&genre=`
Returns: `PaginatedResponse<Shelf>`

### `GET /api/shelves/:id`

### `POST /api/shelves`
Requires: `MANAGE_SHELVES`
```json
{ "code": "A-01", "libraryId": "...", "genre": "FICTION", "location": "...", "position": "L", "capacity": 100 }
```

### `PATCH /api/shelves/:id`
Requires: `MANAGE_SHELVES`

### `DELETE /api/shelves/:id`
Requires: ADMIN role

---

## Books

GET routes use optional authentication — books whose copies are all in private libraries are hidden from unauthenticated users.

### `GET /api/books`
Query: `?page=1&limit=20&search=&genre=&language=`
Returns: `PaginatedResponse<Book>`

### `GET /api/books/isbn/:isbn`
Look up a book by ISBN. Checks local catalogue first, then Open Library.
Returns: `{ alreadyExists, book, source }` where `source` is `"local" | "openLibrary" | "notFound"`

### `GET /api/books/:id`

### `GET /api/books/:id/copies`
Returns all copies with shelf + library info.

### `POST /api/books`
Requires: `MANAGE_BOOKS`
```json
{ "isbn": "...", "title": "...", "author": "...", "genre": "FICTION", ... }
```

### `POST /api/books/isbn`
Requires: `MANAGE_BOOKS`
Creates a book from ISBN lookup metadata.
```json
{ "isbn": "...", "genre": "FICTION" }
```

### `PATCH /api/books/:id`
Requires: `MANAGE_BOOKS`

### `DELETE /api/books/:id`
Requires: ADMIN role

---

## Book Copies

### `GET /api/copies`
Requires: `MANAGE_COPIES`
Query: `?bookId=&shelfId=&status=AVAILABLE`
Returns: `PaginatedResponse<BookCopy>`

### `GET /api/copies/:id`

### `POST /api/copies`
Requires: `MANAGE_COPIES`
```json
{ "barcode": "CC-BK-001", "bookId": "...", "shelfId": "...", "condition": "GOOD" }
```

### `PATCH /api/copies/:id`
Requires: `MANAGE_COPIES`
```json
{ "barcode": "...", "condition": "FAIR", "shelfId": "..." }
```

### `PATCH /api/copies/:id/status`
Requires: `MANAGE_COPIES`
```json
{ "status": "AVAILABLE|DAMAGED|RETIRED" }
```

### `DELETE /api/copies/:id`
Requires: ADMIN role

---

## Loans

All routes require authentication (applied in `app.ts`).

### `GET /api/loans`
Requires: `VIEW_ALL_LOANS`
Query: `?page=1&limit=20&status=ACTIVE&userId=`
Returns: `PaginatedResponse<Loan>`

### `GET /api/loans/:id`

### `POST /api/loans`
Requires: `ISSUE_LOANS`
```json
{ "userId": "...", "bookCopyId": "...", "dueDate": "2026-04-10", "notes": "..." }
```

### `PATCH /api/loans/:id/return`
Requires: `RETURN_LOANS`

### `PATCH /api/loans/:id/renew`
Extends the due date by 14 days (once per loan).

### `PATCH /api/loans/:id/overdue`
Requires: ADMIN role. Marks loan as OVERDUE.

---

## Reservations

All routes require authentication (applied in `app.ts`).

### `GET /api/reservations`
Requires: `VIEW_ALL_RESERVATIONS`
Query: `?page=1&limit=20&status=PENDING&userId=`
Returns: `PaginatedResponse<Reservation>`

### `GET /api/reservations/:id`

### `POST /api/reservations`
```json
{ "bookId": "...", "notes": "..." }
```

### `PATCH /api/reservations/:id/cancel`

### `PATCH /api/reservations/:id/fulfill`
Requires: `MANAGE_RESERVATIONS`
```json
{ "bookCopyId": "..." }
```

---

## Groups

All routes require ADMIN role.

Groups represent named roles in the system. The three built-in groups (`MEMBER`, `LIBRARIAN`, `ADMIN`) are always present and cannot be deleted. Each group has an `order` field (lower = higher rank). A user can only assign roles with a higher `order` (lower rank) than their own.

### `GET /api/groups`
Returns all groups ordered by rank, with their resolved permission map.
```json
[{ "id": "...", "name": "ADMIN", "description": null, "isBuiltIn": true, "order": 1, "permissions": { "MANAGE_BOOKS": true, ... } }]
```

### `POST /api/groups`
```json
{ "name": "SENIOR_LIBRARIAN", "description": "..." }
```
Name must match `^[A-Z][A-Z0-9_]*$`. Cannot duplicate a built-in group name. New group is appended at the lowest rank.

### `POST /api/groups/reorder`
```json
{ "names": ["ADMIN", "SENIOR_LIBRARIAN", "LIBRARIAN", "MEMBER"] }
```
Reassigns `order` values sequentially (1-indexed) for all groups in the given order. All group names must be valid.

### `PATCH /api/groups/:name`
```json
{ "name": "NEW_NAME", "description": "Updated description" }
```
`name` renames the group (updates all users and permissions referencing it in a transaction). Cannot rename built-in groups. Both fields are optional.

### `DELETE /api/groups/:name`
Deletes a custom group. Fails if any users are assigned to it. Built-in groups cannot be deleted.

---

## Permissions

Requires: ADMIN role

### `GET /api/permissions`
Returns the full permission matrix for MEMBER and LIBRARIAN roles.
```json
{
  "permissions": ["MANAGE_BOOKS", "MANAGE_LIBRARIES", ...],
  "matrix": {
    "MEMBER": { "MANAGE_BOOKS": false, ... },
    "LIBRARIAN": { "MANAGE_BOOKS": true, ... }
  }
}
```

### `PATCH /api/permissions/:role/:permission`
Toggle a permission for a role (`MEMBER` or `LIBRARIAN`).
```json
{ "granted": true }
```
ADMIN permissions cannot be modified (always granted).

---

## Permission System

The API uses a `RolePermission` table to store per-role, per-permission grants. Permissions are cached in memory for 30 seconds to avoid DB hits on every request.

If no DB record exists for a role+permission combination, the system falls back to these defaults:

| Permission | MEMBER | LIBRARIAN |
|---|---|---|
| VIEW_LIBRARIES | ✓ | ✓ |
| MANAGE_BOOKS | ✗ | ✓ |
| MANAGE_LIBRARIES | ✗ | ✓ |
| MANAGE_SHELVES | ✗ | ✓ |
| MANAGE_COPIES | ✗ | ✓ |
| ISSUE_LOANS | ✗ | ✓ |
| RETURN_LOANS | ✗ | ✓ |
| VIEW_ALL_LOANS | ✗ | ✓ |
| MANAGE_RESERVATIONS | ✗ | ✓ |
| VIEW_ALL_RESERVATIONS | ✗ | ✓ |
| MANAGE_MEMBERSHIPS | ✗ | ✓ |
| VIEW_USERS | ✗ | ✓ |
| MANAGE_USERS | ✗ | ✓ |
| RESET_USER_PASSWORD | ✗ | ✓ |
| VIEW_ALL_LIBRARIES | ✗ | ✗ |
| VIEW_AUDIT_LOG | ✗ | ✗ |

ADMIN always has all permissions (not stored in DB).
`VIEW_ALL_LIBRARIES` bypasses all membership checks — assign to a role to give unrestricted library access.
`VIEW_AUDIT_LOG` allows reading the system-wide audit log at `GET /api/audit`.

---

## Error Responses

All errors return JSON in this shape:
```json
{ "code": "NOT_FOUND", "message": "Book not found" }
```

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request body/query |
| 400 | `BAD_REQUEST` | Business rule violation |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Authenticated but lacks permission |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource |

---

## File Uploads (Images)

Images are stored on disk at `/app/data/uploads/` (Docker volume). Served statically at `GET /uploads/:filename`.

### `POST /api/users/:id/avatar`
Requires: self OR `MANAGE_USERS`
Multipart form upload, field name `avatar`. Accepts JPEG/PNG/WebP, max 2MB.
Stores file and updates `user.avatarUrl`. Returns updated user.

### `POST /api/libraries/:id/image`
Requires: `MANAGE_LIBRARY_IMAGE` permission (admin-only by default).
Multipart form upload, field name `image`. Accepts JPEG/PNG/WebP, max 5MB.
Stores file and updates `library.imageUrl`. Returns updated library.

### `DELETE /api/users/:id/avatar`
Requires: self OR `MANAGE_USERS`. Removes avatar file and clears `avatarUrl`.

### `DELETE /api/libraries/:id/image`
Requires: `MANAGE_LIBRARY_IMAGE`. Removes image file and clears `imageUrl`.

---

## White Label Settings

Stored as `SystemSetting` keys, configurable in `/admin/settings`:

| Key | Default | Description |
|---|---|---|
| `brand.appName` | `Library Portal` | Application name shown in navbar and page titles |
| `brand.logoUrl` | — | URL to a custom logo image (replaces the BookOpen icon) |
| `brand.primaryColor` | `#2563eb` (blue-600) | Primary accent colour used for buttons, links, active states |
| `brand.faviconUrl` | — | URL to a custom favicon |

The frontend reads these from `GET /api/settings/public` (no auth required) and applies them on load.

---

## Two-Factor Authentication (2FA)

### Settings

| Key | Default | Description |
|---|---|---|
| `2fa.requiredRoles` | `[]` (JSON array) | Role names that must have 2FA enabled. Empty = optional for all. |
| `2fa.methods` | `["totp","securityKey"]` | Allowed 2FA methods |

When dev mode is on (`dev.enabled = true`), 2FA requirements are bypassed entirely.

### Schema additions

User gains: `totpSecret` (encrypted), `totpVerified` (boolean), `securityKeys` (relation to `SecurityKey` model).

`SecurityKey` model: `id`, `userId`, `credentialId`, `publicKey`, `counter`, `name`, `createdAt`.

### Endpoints

#### `POST /api/auth/2fa/totp/setup`
Requires: Bearer token. Generates a TOTP secret and returns:
```json
{ "secret": "...", "otpauthUrl": "otpauth://totp/LibraryPortal:user@email?secret=...&issuer=LibraryPortal", "qrCode": "data:image/png;base64,..." }
```

#### `POST /api/auth/2fa/totp/verify`
Requires: Bearer token. Confirms setup by verifying a TOTP code:
```json
{ "code": "123456" }
```
On success, marks `totpVerified = true`.

#### `DELETE /api/auth/2fa/totp`
Requires: Bearer token. Removes TOTP from the account.

#### `POST /api/auth/2fa/security-key/register`
Requires: Bearer token. Returns WebAuthn registration options (challenge).

#### `POST /api/auth/2fa/security-key/verify`
Requires: Bearer token. Completes WebAuthn registration with attestation response.

#### `DELETE /api/auth/2fa/security-key/:id`
Requires: Bearer token. Removes a security key.

#### Login flow with 2FA

`POST /api/auth/login` with correct credentials returns:
- If 2FA not set up and not required: normal `{ user, accessToken, refreshToken }`
- If 2FA is set up or required: `{ userId, requires2FA: true, methods: ["totp", "securityKey"] }`

Then the client calls:
- `POST /api/auth/2fa/challenge` with `{ userId, method: "totp", code: "123456" }` OR
- `POST /api/auth/2fa/challenge` with `{ userId, method: "securityKey", assertion: {...} }`

On success: returns `{ user, accessToken, refreshToken }`.

---

## New Permissions

| Permission | MEMBER | LIBRARIAN | Description |
|---|---|---|---|
| `CREATE_LIBRARY` | ✗ | ✗ | Create new libraries (admin-only by default) |
| `MANAGE_LIBRARY_IMAGE` | ✗ | ✗ | Upload/remove library images (admin-only by default) |

---

## Seed Accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@library.com` | `Admin1234!` |
| LIBRARIAN | `librarian@library.com` | `Librarian1!` |
| MEMBER | `member@library.com` | `Member123!` |
