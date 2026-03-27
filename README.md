# Library Portal

A full-stack library management system consisting of a REST API and a web frontend.

## Project Structure

```
libraryPortal/
├── api/        — Node.js/TypeScript REST API (Express + Prisma + SQLite)
└── site/       — React 19 web frontend (Vite + Tailwind CSS v4)
```

---

## API

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
cd api
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

The defaults in `.env.example` work for local development — the only required change is setting strong JWT secrets for any non-dev environment.

### Database

Run the initial migration (creates `prisma/dev.db`) and seeds test data:

```bash
npm run db:migrate
```

Or if the database already exists and you just want to seed:

```bash
npm run db:seed
```

To reset everything and start fresh:

```bash
npm run db:reset
```

### Starting the API

**Development** (hot reload):

```bash
cd api
npm run dev
```

The API will be available at `http://localhost:3000`.

**Production**:

```bash
cd api
npm run build
npm start
```

### Health Check

```
GET http://localhost:3000/health
```

### Seed Credentials

After running `db:migrate` or `db:seed`, these accounts are available:

| Role      | Email                      | Password      |
|-----------|----------------------------|---------------|
| Admin     | admin@library.com          | Admin1234!    |
| Librarian | librarian@library.com      | Librarian1!   |
| Member    | member@library.com         | Member123!    |

### API Overview

| Prefix               | Description                          |
|----------------------|--------------------------------------|
| `POST /api/auth/...` | Register, login, refresh, logout     |
| `GET  /api/auth/me`  | Current user profile                 |
| `/api/users`         | User management                      |
| `/api/libraries`     | Library locations                    |
| `/api/shelves`       | Shelves within libraries             |
| `/api/books`         | Book catalog                         |
| `/api/copies`        | Physical book copies                 |
| `/api/loans`         | Checkout / return / renew            |
| `/api/reservations`  | Reserve books when all copies are out|

### Database GUI

```bash
cd api
npm run db:studio
```

Opens Prisma Studio at `http://localhost:5555`.

---

## Site

React 19 frontend built with Vite, Tailwind CSS v4, TanStack Query, React Router v7, and Zustand.

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
cd site
npm install
```

Copy the example env file:

```bash
cp ../.env.example .env
```

### Starting the Site

**Development** (hot reload):

```bash
cd site
npm run dev
```

The site will be available at `http://localhost:5173`.

**Production**:

```bash
cd site
npm run build
npm run preview
```

### Pages & Routes

#### Public

| Route | Description |
|---|---|
| `/` | Home — hero, search, featured books, library list |
| `/books` | Book catalogue — paginated, filterable |
| `/books/:id` | Book detail — metadata, availability, reserve button |
| `/books/isbn/:isbn` | ISBN lookup — search by ISBN, import to catalogue |
| `/libraries` | List of all active libraries |
| `/libraries/:id` | Library detail — info, shelves, available books |
| `/login` | Email/password login |
| `/register` | New member sign-up |

#### Authenticated (Member)

| Route | Description |
|---|---|
| `/dashboard` | Active loans, due dates, pending reservations |
| `/profile` | View and edit own account |

#### Librarian+ (Manage)

| Route | Description |
|---|---|
| `/manage` | Stats overview and quick links |
| `/manage/books` | Search books; ISBN import; edit metadata and copies inline |
| `/manage/libraries` | Create and edit libraries |
| `/manage/libraries/:id/shelves` | Create and edit shelves |
| `/manage/loans` | Issue, return, and renew loans |
| `/manage/reservations` | View, fulfil, and cancel reservations |
| `/manage/users` | Search users; manage roles, memberships, loans |

#### Admin-only

| Route | Description |
|---|---|
| `/admin` | Permission matrix — toggle per-role permissions |

### Tech Stack

| Concern | Library |
|---|---|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v4 (dark mode via `dark` class) |
| Routing | React Router v7 |
| Data fetching | TanStack Query v5 |
| API client | Axios (JWT injection + 401 refresh interceptor) |
| Forms | React Hook Form + Zod |
| State | Zustand (auth session + theme) |
| Icons | Lucide React |
| Notifications | Sonner |

### Auth Flow

1. Login → access token stored in Zustand (in-memory), refresh token in `localStorage`.
2. Axios interceptor attaches `Authorization: Bearer <token>` to every request.
3. On 401, the interceptor calls `POST /api/auth/refresh`, updates the token, and retries once.
4. Logout clears both stores and calls `POST /api/auth/logout` to revoke the refresh token.
