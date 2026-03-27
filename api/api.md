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

## Auth

### `POST /api/auth/register`
Register a new member account.
```json
{ "email": "...", "password": "...", "firstName": "...", "lastName": "..." }
```
Returns: `{ accessToken, refreshToken, user }`

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

---

## Users

All routes require authentication. Permission-controlled via `MANAGE_USERS` permission.

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

### `GET /api/users/:id/loans`
Returns all loans for the given user.

### `GET /api/users/:id/reservations`
Returns all reservations for the given user.

---

## Libraries

GET routes use optional authentication — private libraries are hidden from unauthenticated users and non-patron members.

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
{ "userId": "...", "membershipType": "PERMANENT|MONTHLY|FIXED", "endDate": "...", "notes": "..." }
```
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
| MANAGE_USERS | ✗ | ✗ |

ADMIN always has all permissions (not stored in DB).

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

## Seed Accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@library.com` | `Admin1234!` |
| LIBRARIAN | `librarian@library.com` | `Librarian1!` |
| MEMBER | `member@library.com` | `Member123!` |
