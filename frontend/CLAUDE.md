# CLAUDE.md

## Project Overview

This document is the long-term development guide for the frontend of the task tracker project.
It contains only frontend-related guidance and should be used as the reference for implementation decisions in the frontend workspace. It is independent from `backend/CLAUDE.md`.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Axios (HTTP client) — planned, not yet installed
- A server-state/query library (e.g. TanStack Query) — planned, not yet installed
- React Router — planned, not yet installed

The three "planned" items are implied by the folder structure below (`api/queries`, `api/mutations`, `api/queryKeys.ts`, `routes/`) but haven't been confirmed or installed yet. Confirm the exact libraries before the first implementation step that needs them.

## Frontend Architecture

The frontend is a single-page app that talks to the backend task tracker API (`../backend`) over REST, authenticated with a short-lived JWT access token plus a rotating refresh token.

### Layer responsibilities
- `api/axios`: one configured Axios instance (`instance.ts`), request/response interceptors (`interceptors.ts`) that attach the access token and handle 401s by refreshing, and a token manager (`token-manager.ts`) that is the single place tokens are read from/written to.
- `api/queries` + `api/mutations`: one file per domain (auth, workspace, project, task, comment). Plain functions that call the API through the shared Axios instance — no React or UI concerns here.
- `api/services`: React hooks per domain (`useAuth`, `useWorkspace`, ...) that wrap the queries/mutations for use in components.
- `api/queryKeys.ts`: centralized cache key factory shared by queries and mutations, so invalidation stays consistent.
- `components/ui`: small, reusable, presentation-only building blocks.
- `components/common`: shared components that aren't pure UI primitives (layout helpers, error boundaries, etc.).
- `components/forms`: form components, generally paired with validation.
- `pages`: one folder per route area, composed from components.
- `layouts`: page shells shared across routes (e.g. the authenticated app shell).
- `routes`: router configuration and route guards (`ProtectedRoute`, `PublicRoute`).
- `providers`: app-wide context providers, composed once near the root (`QueryProvider`, `ThemeProvider`, `AuthProvider`).
- `hooks`: generic, reusable hooks not tied to a specific API domain.
- `store`: global client-only state. Server state belongs in `api/queries`, not here.
- `context`: raw React context definitions, generally consumed via a provider.
- `constants`, `types`, `utils`: shared constants, shared TypeScript types, and pure helper functions.

Business/domain logic (e.g. "is this task overdue") should live close to where it's used (a hook or a query's `select`), not scattered across components.

## Folder Structure

```
frontend/
├── .claude/
├── public/
├── src/
│   ├── api/
│   │   ├── axios/
│   │   │   ├── instance.ts
│   │   │   ├── interceptors.ts
│   │   │   └── token-manager.ts
│   │   ├── queries/
│   │   ├── services/
│   │   ├── mutations/
│   │   └── queryKeys.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── common/
│   │   └── forms/
│   ├── pages/
│   ├── layouts/
│   ├── routes/
│   ├── providers/
│   ├── hooks/
│   ├── store/
│   ├── context/
│   ├── constants/
│   ├── types/
│   ├── utils/
│   ├── assets/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
└── vite.config.ts
```

Not every folder needs to exist before it has content — create a folder when the first file that belongs in it is added, not preemptively.

## API Conventions
- All requests go through the single configured Axios instance in `api/axios/instance.ts`. No ad-hoc `fetch`/`axios` calls in components.
- Server state (anything that comes from the API) is owned by the query/mutation layer and consumed via `api/services` hooks — never duplicated into `store/`.
- The access token is attached automatically by a request interceptor. A response interceptor handles `401`s by attempting one refresh (`POST /auth/refresh`) and retrying the original request; if the refresh itself fails, clear tokens and redirect to login.

## Security Rules
- Centralize token storage in `token-manager.ts` so the storage mechanism (memory vs `localStorage` vs elsewhere) can change in one place.
- Never log tokens or passwords.
- Never render sensitive fields the backend wouldn't return anyway (defense in depth, even though the backend already excludes them).
- Clear all stored tokens on logout and on an unrecoverable refresh failure.

## Coding Standards
- Follow Clean Code principles; keep components small and focused on one responsibility.
- Function components and hooks only — no class components.
- Use TypeScript strict mode.
- Prefer composition and hooks over prop drilling for cross-cutting concerns.
- Prefer readability over cleverness.

## Development Workflow

Every frontend task should follow this workflow:

1. Read the relevant files in the `.claude` directory.
2. Explain the implementation plan.
3. Wait for approval if the task requires it.
4. Implement only the requested scope.
5. Verify: build, lint, and actually exercise the UI (dev server), not just type-check.
6. Explain what changed and the architectural decisions made.
7. Update `.claude/progress.md`.
8. Suggest the next logical step and stop for approval before continuing.

Do not implement future milestones or unconfirmed library choices unless explicitly requested.

## Current Milestone

Current version: V1 Authentication UI — login/register forms, token handling, protected routing, and a current-user view, wired to the backend's V1 Authentication API.
