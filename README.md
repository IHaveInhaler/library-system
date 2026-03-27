# Library Portal

A full-stack library management system consisting of a REST API and a web frontend.

## Project Structure

```
libraryPortal/
├── api/        — Node.js/TypeScript REST API
└── site/       — Web frontend (coming soon)
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

Frontend not yet implemented. Will communicate with the API described above.
