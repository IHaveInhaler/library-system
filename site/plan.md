# Library Portal — Frontend Plan

## Stack

- **Framework:** React 19 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **Data fetching:** TanStack Query v5 (caching, loading/error states, pagination)
- **API client:** Axios with an interceptor that injects the JWT access token and handles 401 refresh
- **Forms:** React Hook Form + Zod (same schemas mirrored from the API)
- **State:** TanStack Query for server state; Zustand for auth/session state
- **Icons:** Lucide React
- **Notifications:** Sonner (toast library)
- **Theme:** Dark / light mode toggle stored in `localStorage` key `theme` (`"dark"` | `"light"`); defaults to system preference via `prefers-color-scheme`. Toggle rendered as a slider (`<ThemeToggle>`) in the Navbar.

## Start Command (once built)

```bash
cd site
npm run dev   # http://localhost:5173
```

---

## Pages & Routes

### Public

| Route | Page | Description |
|---|---|---|
| `/` | Home | Hero, search bar, featured books, library list |
| `/books` | Book Catalogue | Paginated, filterable book list |
| `/books/:id` | Book Detail | Cover, metadata, availability by library, reserve button |
| `/books/isbn/:isbn` | ISBN Lookup | Search by ISBN — shows metadata + "Add to catalogue" if not found |
| `/libraries` | Libraries | List of all active libraries |
| `/libraries/:id` | Library Detail | Library info, shelves, available books |
| `/login` | Login | Email/password form |
| `/register` | Register | New member sign-up |

### Authenticated (Member)

| Route | Page | Description |
|---|---|---|
| `/dashboard` | My Dashboard | Active loans, upcoming due dates, pending reservations |
| `/profile` | My Profile | View and edit own account |

### Librarian+ (Manage section)

| Route | Page | Description |
|---|---|---|
| `/manage` | Manage Home | Quick stats (active loans, overdue, reservations, books); quick links to all manage pages |
| `/manage/books` | Manage Books | Search/filter book list; ISBN lookup & import; click row to open book detail drawer (edit metadata, manage copies inline) |
| `/manage/books/:id/copies` | Manage Copies | Register copies, set condition/status, assign to shelf |
| `/manage/libraries` | Manage Libraries | Create / edit libraries |
| `/manage/libraries/:id/shelves` | Manage Shelves | Create / edit shelves with library + location |
| `/manage/loans` | Loans | Issue, return, renew loans; filter by status |
| `/manage/reservations` | Reservations | View, fulfil, cancel reservations |
| `/manage/users` | Users | Search, list, add user; click to open manage drawer (role, active, memberships, loans, reservations) |

### Admin-only

| Route | Page | Description |
|---|---|---|
| `/admin` | Admin Hub | Hub page linking to Permissions and Groups (mirrors Manage page layout) |
| `/admin/permissions` | Admin — Permissions | Role permission matrix; toggle which actions each role (MEMBER, LIBRARIAN) can perform; ADMIN permissions are always locked on |
| `/admin/groups` | Admin — Groups | Create/manage groups (roles); expand each group to toggle its permissions inline; delete custom groups |

---

## Dark Mode

Tailwind v4 uses the `dark` variant with class strategy (add `dark` to `<html>`). The `ThemeToggle` component reads/writes `localStorage` and toggles the class.

### Theme Store (`store/theme.ts`)

Zustand store that:
1. Reads `localStorage.getItem('theme')` on init; falls back to `window.matchMedia('(prefers-color-scheme: dark)').matches`.
2. Applies/removes the `dark` class on `<html>` immediately.
3. Exposes `isDark`, `toggle()`.

### ThemeToggle Component

- Pill-shaped slider (sun ↔ moon icons) in the Navbar, right of the user controls.
- Clicking calls `toggle()` from the theme store.
- No external library needed — pure CSS/Tailwind transition.

### Dark Mode Coverage — All Pages

Every page and shared component must have `dark:` variants for:
- Backgrounds: `bg-white` → `dark:bg-gray-900`, `bg-gray-50` → `dark:bg-gray-800`
- Borders: `border-gray-200` → `dark:border-gray-700`
- Text: `text-gray-900` → `dark:text-white`, `text-gray-500` → `dark:text-gray-400`
- Inputs / selects: `bg-white border-gray-300` → `dark:bg-gray-800 dark:border-gray-600 dark:text-white`
- Cards / panels: shadow + border approach consistent across light/dark
- Tables: header `bg-gray-50` → `dark:bg-gray-800`, row hover `hover:bg-gray-50` → `dark:hover:bg-gray-800/60`
- Modals: overlay + panel both need dark variants
- Badges: use variant-specific dark colours
- Navbar: `bg-white border-gray-200` → `dark:bg-gray-900 dark:border-gray-700`
- Toasts (Sonner): pass `theme` prop from store so toasts match the active theme

#### Page checklist

| Page | Needs dark mode |
|---|---|
| HomePage | ✓ Hero, feature cards, search input |
| BooksPage | ✓ Filter bar, book cards, pagination |
| BookDetailPage | ✓ Detail panel, copy table |
| LibrariesPage | ✓ Library cards |
| LibraryDetailPage | ✓ Info panel, shelves table |
| LoginPage | ✓ Card, inputs, button, forgot password link |
| RegisterPage | ✓ Card, inputs, button |
| ForgotPasswordPage | ✓ Email input, sends reset link |
| ResetPasswordPage | ✓ Token from URL, new password form |
| DashboardPage | ✓ Stat cards, loan/reservation tables |
| ManagePage (was AdminHomePage) | ✓ Stat cards, quick-link cards |
| AdminPermissionsPage | ✓ Permission matrix table, toggle switches |
| ManageBooksPage | ✓ Table, search input, ISBN modal |
| ManageLibrariesPage | ✓ Table, create modal |
| ManageShelvesPage | ✓ Table, create modal |
| ManageCopiesPage | ✓ Table, assign modal |
| LoansPage | ✓ Table, status filter, issue/return modal |
| ReservationsPage | ✓ Table, status filter |
| UsersPage | ✓ Table, role badge, edit modal |
| Navbar | ✓ Background, links, ThemeToggle |
| All modals | ✓ Overlay + panel |
| All UI primitives | ✓ Button, Input, Badge, Spinner, EmptyState, Pagination, Modal |

---

## Component Structure

```
site/src/
├── main.tsx
├── App.tsx                     — router, providers (QueryClient, AuthProvider)
│
├── api/
│   ├── client.ts               — Axios instance, token injection, 401 refresh interceptor
│   ├── auth.ts
│   ├── books.ts
│   ├── libraries.ts
│   ├── shelves.ts
│   ├── copies.ts
│   ├── loans.ts
│   ├── reservations.ts
│   ├── groups.ts
│   └── users.ts
│
├── store/
│   ├── auth.ts                 — Zustand: accessToken, user, setAuth, clearAuth
│   └── theme.ts                — Zustand: isDark, toggle(); persists to localStorage
│
├── hooks/
│   ├── useAuth.ts              — wraps auth store + login/logout mutations
│   ├── useBooks.ts             — TanStack Query hooks for books
│   ├── useLoans.ts
│   └── ...                     — one hooks file per domain
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          — responsive nav, auth state, role-aware links, ThemeToggle
│   │   ├── Sidebar.tsx         — admin sidebar
│   │   ├── Footer.tsx
│   │   └── ThemeToggle.tsx     — pill slider (sun/moon), reads/writes theme store
│   │
│   ├── ui/                     — headless, reusable primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Badge.tsx           — status badges (ACTIVE, OVERDUE, etc.)
│   │   ├── Modal.tsx
│   │   ├── Table.tsx           — sortable, paginated
│   │   ├── Pagination.tsx
│   │   ├── Spinner.tsx
│   │   └── EmptyState.tsx
│   │
│   ├── books/
│   │   ├── BookCard.tsx        — cover, title, author, availability badge
│   │   ├── BookGrid.tsx
│   │   ├── BookFilters.tsx     — genre, language, search bar
│   │   ├── IsbnSearch.tsx      — ISBN input + lookup + "Add to catalogue" flow
│   │   └── AvailabilityBadge.tsx
│   │
│   ├── loans/
│   │   ├── LoanRow.tsx
│   │   ├── IssueLoanModal.tsx  — copy selector + due date picker
│   │   └── LoanStatusBadge.tsx
│   │
│   ├── reservations/
│   │   ├── ReservationRow.tsx
│   │   └── ReserveBookButton.tsx
│   │
│   └── auth/
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       └── ProtectedRoute.tsx  — redirects if not authed or wrong role
│
└── pages/
    ├── public/
    │   ├── HomePage.tsx
    │   ├── BooksPage.tsx
    │   ├── BookDetailPage.tsx
    │   ├── IsbnLookupPage.tsx
    │   ├── LibrariesPage.tsx
    │   ├── LibraryDetailPage.tsx
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   └── ResetPasswordPage.tsx
    │
    ├── member/
    │   ├── DashboardPage.tsx
    │   └── ProfilePage.tsx
    │
    └── admin/
        ├── ManagePage.tsx          — /manage dashboard
        ├── AdminPage.tsx           — /admin hub (links to Permissions, Groups)
        ├── AdminPermissionsPage.tsx — /admin/permissions permission matrix
        ├── GroupsPage.tsx          — /admin/groups create/manage groups & permissions
        ├── ManageBooksPage.tsx
        ├── ManageCopiesPage.tsx
        ├── ManageLibrariesPage.tsx
        ├── ManageShelvesPage.tsx
        ├── LoansPage.tsx
        ├── ReservationsPage.tsx
        └── UsersPage.tsx
```

---

## Key Implementation Details

### Auth Flow

1. Login → store `accessToken` in Zustand (in-memory), store `refreshToken` in `localStorage`.
2. Axios interceptor attaches `Authorization: Bearer <accessToken>` to every request.
3. On 401, interceptor calls `POST /api/auth/refresh`, updates the token, retries the failed request once.
4. Logout clears both stores and calls `POST /api/auth/logout` to revoke the refresh token.

### ISBN Lookup & Import Flow

1. User types an ISBN in `IsbnSearch`.
2. `GET /api/books/isbn/:isbn` is called.
3. If `alreadyExists: true` → show the book card with a link to its detail page.
4. If `alreadyExists: false` → show pre-filled form with Open Library metadata.
5. Librarian can adjust the genre, then confirm → `POST /api/books/isbn`.

### Pagination

All list pages use the `meta` object returned by the API (`page`, `limit`, `total`, `totalPages`) with a shared `<Pagination>` component and URL search params (`?page=2&limit=20`) for bookmarkable state.

### Role-Aware Rendering

`ProtectedRoute` accepts a `roles` prop. A separate `useRole()` hook exposes the current user's role for conditional UI (e.g. hiding "Add to catalogue" from MEMBER).

### Error Handling

API errors are normalised by the Axios client into `{ code, message, errors? }`. TanStack Query's `onError` feeds them to Sonner toasts globally.

---

## Admin Pages — Detailed Design

### AdminPermissionsPage (`/admin`)

**Permission matrix**
- Rows: each named permission (MANAGE_BOOKS, MANAGE_LIBRARIES, MANAGE_SHELVES, MANAGE_COPIES, ISSUE_LOANS, RETURN_LOANS, VIEW_ALL_LOANS, MANAGE_RESERVATIONS, VIEW_ALL_RESERVATIONS, MANAGE_MEMBERSHIPS, MANAGE_USERS)
- Columns: MEMBER, LIBRARIAN, ADMIN
- ADMIN column: always locked on (lock icon, not toggleable)
- MEMBER / LIBRARIAN cells: toggle switch; `PATCH /api/permissions/:role/:permission`
- Changes save immediately with optimistic UI
- Permissions stored in `RolePermission` DB table; API enforces them via `authorizePermission` middleware (with 30s in-memory cache)



### UsersPage (`/admin/users`)

**List panel (left / full width)**
- Search input (debounced, hits `GET /users?search=`) — filters by name or email live
- Role filter pill tabs: All / MEMBER / LIBRARIAN / ADMIN
- Active/inactive toggle filter
- Paginated table: name, email, role badge, active badge, joined date, "Manage" button
- "Add User" button top-right → opens `AddUserModal`

**AddUserModal**
- Fields: first name, last name, email, password, role (select)
- `POST /api/users` (new admin-only endpoint)

**ManageUserDrawer** (slide-in side panel, opens on row click / "Manage")
Tabs:
1. **Details** — view/edit name, role (select), active toggle; save via `PATCH /api/users/:id`
2. **Memberships** — list of `LibraryMembership` records; add membership (library picker + type + end date); revoke/deactivate existing
3. **Loans** — read-only list of this user's loans (`GET /users/:id/loans`) with status badges
4. **Reservations** — read-only list of reservations (`GET /users/:id/reservations`)

### ManageBooksPage (`/admin/books`) — enhanced

**List** (existing, with additions):
- Click anywhere on a book row opens `BookDrawer`

**BookDrawer** (slide-in side panel)
Tabs:
1. **Details** — editable fields (title, author, publisher, year, genre, description, language); save via `PATCH /api/books/:id`
2. **Copies** — table of all copies for this book (`GET /books/:id/copies`):
   - Each row: barcode, library, shelf, condition badge, status badge, actions (update condition/status, delete)
   - "Add Copy" button → inline form: barcode, shelf picker (search shelves), condition
   - `POST /api/copies`, `PATCH /api/copies/:id`, `DELETE /api/copies/:id`

---

## Implementation Order

1. Scaffold Vite + React + TypeScript + Tailwind
2. API client, auth store, ProtectedRoute
3. Login / Register pages
4. Book catalogue + detail (public, read-only)
5. ISBN lookup page
6. Member dashboard (loans, reservations)
7. Admin: Libraries + Shelves management
8. Admin: Books + Copies management
9. Admin: Loans (issue, return, renew)
10. Admin: Reservations
11. Admin: Users (ADMIN only)
12. Dark mode: theme store + ThemeToggle + `dark:` variants across all pages/components
13. Polish: responsive design, loading skeletons, empty states
