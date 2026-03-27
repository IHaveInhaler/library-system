Library Management System will consist of an API and Site

api will handle everything, user interaction etc

site will interact with that ui

## Service Context

The recommended way to start the project is via Docker Compose so that logs are centralised:

```bash
docker-compose up --build        # first run / after changes
docker-compose up                # subsequent runs
docker-compose logs -f           # tail all logs
docker-compose logs -f api       # tail API logs only
```

Individual services can still be run for development:

- API: `cd api && npm run dev` (runs on http://localhost:3000)
- Database GUI: `cd api && npm run db:studio` (runs on http://localhost:5555)
- Site: `cd site && npm run dev` (runs on http://localhost:5173)
- Start everything at once: `./start.sh` from the project root

Never assume a service is already running — mention how to start it in context.

## Project Documentation

Full structure, setup steps, routes, and usage details for each service are documented in `README.md` at the project root. This file must be kept up to date whenever:

- New API routes or modules are added/removed
- The site is scaffolded or its structure changes
- Start commands, ports, or environment variables change
- New seed accounts or database changes are made

When making changes to the API (`api/`) or site (`site/`), always update the relevant section of `README.md` to reflect those changes.

## API Plan

The full API reference lives at `api/api.md`. It covers:
- All routes (method, path, auth requirements, request/response shapes)
- Permission system (role-based with DB overrides)
- Environment variables
- Error response format
- Seed accounts

Always consult `api/api.md` before adding new routes or modules to stay aligned with the API architecture. Update `api/api.md` whenever:

- New routes or modules are added/removed
- Auth or permission requirements change
- Request/response shapes change
- New environment variables are introduced

## Frontend Plan

The full frontend implementation plan lives at `site/plan.md`. It covers:
- Tech stack (React 19, Vite, Tailwind CSS v4, TanStack Query, React Router v7, Zustand, Zod)
- All pages and routes (public, member, manage, admin)
- Full component/folder structure
- Auth flow (JWT with refresh token rotation via Axios interceptor)
- ISBN lookup & import flow
- Implementation order

Always consult `site/plan.md` before adding new pages or components to stay aligned with the planned architecture. Update `site/plan.md` whenever:

- New pages or routes are added/removed
- New components are introduced
- The routing structure changes
- Dark mode coverage needs updating

## Design Guidelines

The frontend design language is documented in `site/web-design.md`. It covers:
- Color palette (dark-first), spacing, layout containers
- Component patterns: cards, section cards, stat cards, expandable cards, tables
- Buttons, inputs, modals, badges, toggles, alerts, empty states
- Navbar, step indicators, auth page layouts
- Anti-patterns to avoid

Always consult `site/web-design.md` before creating or modifying frontend components. Every page must follow these guidelines. Dark mode is the priority.

## Environment Files

When adding or changing environment variables in `.env`, always update `.env.example` (project root) and `api/.env.example` to match. These files document all available env vars for new setups.

## Docker

Use `docker-compose.yaml` (NOT `compose.yaml`) for Docker Compose files. This is a hard requirement.

## When told to implement somethng:

- First plan it in the relevant '.md' file; for site that's 'site/plan.md' and for api that's '/api/api.md'
- After confirming nothing conlicts, then implement it.
