# CLAUDE.md

## Project Overview

This document is the long-term development guide for the frontend of the task tracker project.
It contains only frontend-related guidance and should be used as the reference for implementation decisions in the frontend workspace. It is independent from `backend/CLAUDE.md`.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Axios (HTTP client)
- TanStack Query (server state / caching)
- React Router (v8 — imported from the `react-router` package directly; `react-router-dom` is the legacy/frozen name as of this version)
- React Hook Form + Zod (+ `@hookform/resolvers` for the RHF↔Zod glue) — used by the login/register forms in `features/auth`

## Frontend Architecture

The frontend is a single-page app that talks to the backend task tracker API (`../backend`) over REST, authenticated with a short-lived JWT access token plus a rotating refresh token.

Architecture is a pragmatic Feature-Sliced Design (`app / pages / widgets / features / entities / shared`) combined with a centralized API layer in `shared/api` — HTTP code is not split per-feature. See `.claude/architecture.md` for the full rationale.

### Layer responsibilities
- `app/`: application-wide composition — root `App.tsx`, `providers/` (`QueryProvider`, composed once near the root), `routes/` (router config, `ProtectedRoute`/`PublicRoute` guards), `layouts/` (shared page shells, e.g. the authenticated app shell). Nothing domain-specific lives here.
- `pages/`: one folder per route area, composed from features/widgets/entities. Pages never call HTTP directly.
- `widgets/`: composite UI blocks spanning multiple features/entities. `widgets/app-header` — the dashboard header (current user email + logout), extracted from `DashboardLayout` since it composes an entity (user) with a feature (auth). `widgets/task-board` — the drag-and-drop Kanban board on `ProjectPage`, one column per task status.
- `features/`: one folder per user-facing capability (auth, workspace, project, task, comment), each owning only its own components/hooks/schemas/types/utils. Created lazily. `features/auth` — `LoginForm`/`RegisterForm`. `features/workspace`/`features/project`/`features/task` — one `Create{Name}Form` + schema each (no update form yet — deferred; task status/assignee are updatable in the UI, but via an inline control on `ProjectPage`, not a form).
- `entities/`: domain models shared across the app — `entities/user/model/user.ts`, `entities/workspace/model/{workspace.ts,workspace-member.ts}`, `entities/project/model/project.ts`, `entities/task/model/task.ts` (also exports `taskStatusValues`/`TASK_STATUS_LABELS` and `taskPriorityValues`/`TASK_PRIORITY_LABELS`/`TASK_PRIORITY_DOT_CLASSES`).
- `shared/api/axios`: one configured Axios instance (`instance.ts`), request/response interceptors (`interceptors.ts`) that attach the access token and handle 401s by refreshing, and a token manager (`token-manager.ts`) that is the single place tokens are read from/written to.
- `shared/api/queries`: one file per domain (auth, workspace, project, task). Plain functions that call the API through the shared Axios instance — no React or UI concerns, and no query/mutation split (a domain file holds both reads and writes, e.g. `getMe`, `login`, `register`, `logoutRequest`; `getWorkspaces`, `createWorkspace`, `getWorkspaceMembers`, ...).
- `shared/api/services`: React Query hooks per domain (`useAuth`, `useLogin`, `useRegister`; `useWorkspaces`/`useWorkspace`/`useWorkspaceMembers`/`useCreateWorkspace`/`useUpdateWorkspace`/`useDeleteWorkspace`; `useProjects`/`useProject`/...; `useTasks`/`useTask`/`useCreateTask`/`useUpdateTask`/`useDeleteTask`) that wrap `queries` for use in components.
- `shared/api/queryClient.ts`: the shared `QueryClient` instance.
- `shared/api/queryKeys.ts`: centralized cache key factory shared by queries, so invalidation stays consistent.
- `shared/lib`: generic, non-domain-specific helpers. First one: `getErrorMessage.ts` (extracts a backend error message from an Axios error).
- `shared/ui`: presentation-only primitives with no domain logic — `Button` (`variant: 'primary' | 'ghost' | 'logout' | 'nav'`), `Input`, `Select` (native dropdown, same labeled treatment as `Input`), `Listbox` (fully custom dropdown — colored dot per option, custom panel — for when a native `<select>`'s option styling isn't enough; wire it up via React Hook Form's `Controller`, not `register()`), `FormError`, `Modal` (portal-rendered dialog, Escape/backdrop to close). Used by `features/auth`/`features/workspace`/`features/project`/`features/task`'s forms and `widgets/app-header`. See "Visual Design System" in `architecture.md` for the token system these are built on.
- `shared/hooks`, `shared/utils`, `shared/constants`: generic reusable code not tied to a domain — no business logic. Created as content actually exists.
- `store/` (not yet created): global client/UI-only state (theme, sidebar, modal visibility, etc.). **Never the authenticated user, `isAuthenticated`, or any other server-originated data** — that's server state and belongs in the query cache via `shared/api/services`, full stop, no exceptions. (This was tried once and reverted — see `progress.md`'s "Step 2 correction" entry for why.)

Business/domain logic (e.g. "is this task overdue") should live close to where it's used (a feature hook or a query's `select`), not scattered across components.

## Folder Structure

```
frontend/
├── .claude/
├── public/
├── src/
│   ├── app/
│   │   ├── providers/
│   │   ├── routes/
│   │   ├── layouts/
│   │   └── App.tsx
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── workspace/
│   │   └── project/
│   ├── widgets/
│   │   ├── app-header/
│   │   │   └── ui/
│   │   └── task-board/
│   │       └── ui/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   └── schemas/
│   │   ├── workspace/
│   │   │   ├── components/
│   │   │   └── schemas/
│   │   ├── project/
│   │   │   ├── components/
│   │   │   └── schemas/
│   │   └── task/
│   │       ├── components/
│   │       └── schemas/
│   ├── entities/
│   │   ├── user/
│   │   │   └── model/
│   │   ├── workspace/
│   │   │   └── model/
│   │   ├── project/
│   │   │   └── model/
│   │   └── task/
│   │       └── model/
│   ├── shared/
│   │   ├── api/
│   │   │   ├── axios/
│   │   │   │   ├── instance.ts
│   │   │   │   ├── interceptors.ts
│   │   │   │   └── token-manager.ts
│   │   │   ├── queries/
│   │   │   ├── services/
│   │   │   ├── queryClient.ts
│   │   │   └── queryKeys.ts
│   │   ├── lib/
│   │   │   └── getErrorMessage.ts
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Listbox.tsx
│   │   │   ├── FormError.tsx
│   │   │   └── Modal.tsx
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── constants/
│   ├── assets/
│   ├── styles/
│   └── main.tsx
└── vite.config.ts
```

Not every folder needs to exist before it has content — create a folder when the first file that belongs in it is added, not preemptively. `shared/hooks`, `shared/utils`, `shared/constants` are intentionally absent from the current tree.

## API Conventions
- All requests go through the single configured Axios instance in `shared/api/axios/instance.ts`. No ad-hoc `fetch`/`axios` calls in components, pages, or features.
- Server state (anything that comes from the API) is owned by `shared/api/queries` and consumed via `shared/api/services` hooks — never duplicated into `store/`. This includes the authenticated user: `useAuth()` (`shared/api/services/useAuth.ts`) wraps a `["auth","me"]` query; `isAuthenticated` is derived as `Boolean(user)`, never stored separately.
- The access token is attached automatically by a request interceptor. A response interceptor handles `401`s by attempting one refresh (`POST /auth/refresh`) and retrying the original request; if the refresh itself fails, clear tokens and redirect to login.
- When a mutation needs to update auth state immediately (login, register, logout), write the result straight into the cache with `queryClient.setQueryData(queryKeys.auth.me, ...)`. Don't use `removeQueries`/`invalidateQueries` for this — confirmed by testing in a real browser that `removeQueries` does not reliably re-render already-mounted `useQuery` observers on this stack (`@tanstack/react-query` 5.x + React 19), while `setQueryData` does.
- For list/detail resources (workspaces, projects), plain `invalidateQueries` on mutation success is fine — but for **delete** mutations specifically, pass `exact: true` and explicitly `removeQueries` the deleted item's own detail key. `invalidateQueries` fuzzy-matches by key prefix by default, so a non-`exact` invalidation of a list key also refetches that same item's still-mounted detail query — which 404s if the user is deleting the very resource they're currently viewing. Confirmed via a real browser: the page that's about to navigate away should also navigate *before* firing the delete mutation (`mutate`, not awaited `mutateAsync`), not after — otherwise the mutation's cache cleanup runs while the page (and its queries) are still mounted.

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

Current version: V4 Task Management UI. V1 Authentication, V2/V3 Workspace + Project UI, and V4 Task UI are all functionally complete — list/create/view/delete across workspaces/projects/tasks, nested routing (`/workspaces/:workspaceId`, `/workspaces/:workspaceId/projects/:projectId`), a drag-and-drop Kanban board for tasks (native HTML5 DnD, no new dependency) with status columns and LOW/MEDIUM/HIGH priority (custom `Listbox` picker, colored top-border + text label on each card), assignment (picked from the workspace's members), client-side owner/creator gating on destructive actions (the backend is the real enforcement), and a full visual redesign ("The Ledger Desk" — see `architecture.md`). The board is drag/select-only by design — a task edit modal was built and then deliberately removed per feedback (see `progress.md`). Not yet built: edit/rename UI for workspaces/projects/tasks, and member invitation UI.
