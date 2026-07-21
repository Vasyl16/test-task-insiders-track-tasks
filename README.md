# Task Tracker

A full-stack task tracker: workspaces → projects → tasks, with comments, task status history, workspace invites, and a real-time Kanban board.

- `backend/` — NestJS + Prisma + PostgreSQL REST API
- `frontend/` — React + TypeScript + Vite SPA

## Tech stack & architecture decisions

**Backend — NestJS, layered `Controller → Service → Repository → Prisma`.**
Chosen for a strict separation of HTTP concerns, business logic, and data access — each module (auth, workspaces, projects, tasks, comments, history, invites, realtime) is self-contained, and every repository talks to Prisma directly rather than reaching into another module's repository, so modules stay independently reasoned-about even as the domain graph (workspace → project → task → comment) gets deep.

**PostgreSQL + Prisma.**
The domain is inherently relational (workspaces own projects own tasks own comments, with membership and assignment as real foreign keys), so a relational DB with real constraints made more sense than a document store. Prisma gives typed queries and migrations without hand-writing SQL, and its driver-adapter mode (`@prisma/adapter-pg`) is used directly rather than relying on the classic connection-string-in-schema setup. Composite indexes were added deliberately where the actual query shape needed them (invite duplicate-checks, keyset task pagination) rather than indexing every column speculatively.

**Socket.IO (`@nestjs/websockets`) for real-time board sync.**
When a task is created/updated/deleted, every other client currently viewing that project's board is notified over a per-project WebSocket room and refetches — chosen over polling for immediacy and over a heavier message-bus setup as unnecessary at this scale.

**Frontend — React 19 + TanStack Query, feature-sliced-ish layout (`app / pages / widgets / features / entities / shared`).**
All server state (including the authenticated user) lives in the TanStack Query cache — there is deliberately no separate client store duplicating it. React Hook Form + Zod for forms, DnD Kit for the Kanban board's drag-and-drop, Tailwind for styling.

## Features

- Auth: register/login/logout, JWT access + rotating refresh tokens.
- Workspaces & projects: CRUD, membership, owner/creator-gated edit & delete.
- Tasks: CRUD, Kanban board with drag-and-drop status changes, priority, assignee, optional due date, search/priority/assignee filters, cursor-paginated.
- Comments and an automatic task status history audit log.
- Workspace invites: send → accept/decline, with a best-effort email notification.
- Real-time board sync over WebSockets (create/update/delete broadcast to everyone viewing that project).
- Search/sort/ownership filters and pagination on every list endpoint.
- Swagger API docs (`@nestjs/swagger`, auto-generated from the existing `class-validator` DTOs).

## Running it

**Prerequisites:** Docker + Docker Compose, and a reachable PostgreSQL database (a free [Neon](https://neon.tech) or [Supabase](https://supabase.com) project takes a couple of minutes to set up and works well here).

1. Clone the repo.
2. Create the env files from their examples:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
3. Edit `backend/.env`:
   - `DATABASE_URL` — your Postgres connection string. If you're pointing at a Postgres running on your own machine rather than a cloud one, use `host.docker.internal` instead of `localhost` in the URL, since the backend runs inside a container.
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — any random string for local use.
   - `EMAIL_FROM` / `EMAIL_TOKEN` — optional. Invite emails are best-effort (a send failure is logged and swallowed, never breaks the request), so the app runs fine with these left blank.
   - `frontend/.env`'s default (`http://localhost:3000/api`) already matches the backend's default published port — no edit needed for a standard local run.
4. From the repo root:
   ```bash
   docker-compose up --build
   ```
   This installs dependencies, generates the Prisma client, applies all migrations against your `DATABASE_URL`, and starts both dev servers with hot reload.
5. Open:
   - Frontend: http://localhost:5173
   - API: http://localhost:3000/api
   - Swagger docs: http://localhost:3000/api/docs

## What I'd do differently / didn't get to

- **Unit tests.** Everything so far was verified manually (and via live Playwright scripts against real dev servers) rather than with an automated suite — adding Jest unit tests for the service/repository layers is the next thing I'd learn and add.
- **Rate limiting.** Auth endpoints in particular (`login`, `register`, `refresh`) have no throttling yet — `@nestjs/throttler` would be the natural fit given the rest of the stack.
- **CI pipeline.** No GitHub Actions (or similar) yet to run lint/typecheck/build/tests automatically on every push or PR — currently all of that is run locally by hand before committing.
  x
