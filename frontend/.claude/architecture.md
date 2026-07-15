# Frontend Architecture

## Architecture Style
A pragmatic Feature-Sliced Design: `app / pages / widgets / features / entities / shared`, combined with a centralized API layer under `shared/api` (rather than splitting HTTP code per-feature).

Data flow: Page → `shared/api/services` hook → `shared/api/queries` → `shared/api/axios` instance → backend API.

## Layer Responsibilities
- `app/`: application-wide composition — root `App.tsx`, `providers/` (context/query providers composed once near the root), `routes/` (router config, `ProtectedRoute`/`PublicRoute` guards), `layouts/` (shared page shells, e.g. the authenticated app shell with nav). Nothing here is domain-specific.
- `pages/`: route-level composition, grouped by area (auth, dashboard, workspace, project, task). Pages compose features/widgets/entities — they never call HTTP directly.
- `widgets/`: composite UI blocks made of multiple features/entities. First one: `widgets/app-header` (`ui/AppHeader.tsx`) — the dashboard header, composing the current user's email (`entities/user` data, via `shared/api/services`) with the logout action (`features/auth`'s domain, though the action itself is just `useAuth().logout`). Extracted out of `app/layouts/DashboardLayout.tsx` because it's a composite, not a plain shell.
- `features/`: one folder per user-facing capability (`auth`, `workspace`, `project`, `task`, `comment`), each owning only its own business logic — components, hooks, schemas (Zod), types, utils. Folders are created lazily. First one: `features/auth` — `schemas/{loginSchema,registerSchema}.ts` (Zod; register's schema adds a client-only `confirmPassword` with a `.refine` check, never sent to the backend) and `components/{LoginForm,RegisterForm}.tsx` (React Hook Form + `zodResolver`, calling `shared/api/services`' `useLogin`/`useRegister`). HTTP calls and server-state hooks still live in `shared/api`, not here — a feature folder holds the form/UI logic that *consumes* those hooks.
- `entities/`: domain models shared across features/pages (e.g. `entities/user/model/user.ts`). Grows one folder per backend domain as each becomes real (task, project, workspace, comment).
- `shared/api/axios`: the single Axios instance, interceptors (attach access token, handle 401 refresh-and-retry), and the token manager (sole owner of token storage).
- `shared/api/queries`: one file per domain (`auth.ts`, later `workspace.ts`, `project.ts`, ...). Plain HTTP functions only — no React, no query/mutation distinction (a domain file holds both reads and writes, e.g. `getMe`, `login`, `register`, `logoutRequest`).
- `shared/api/services`: React Query hooks per domain (`useAuth`, `useLogin`, `useRegister`, later `useWorkspace`, ...) that wrap `queries` for components to consume.
- `shared/api/queryClient.ts` / `queryKeys.ts`: the shared `QueryClient` instance and cache-key factory, so queries/mutations invalidate consistently.
- `shared/lib`: generic, framework-agnostic helpers with no business logic. First one: `getErrorMessage.ts` (pulls a backend error message out of an Axios error, with a fallback) — kept here rather than in `features/auth` since it isn't auth-specific.
- `shared/ui`: presentation-only primitives with no domain knowledge — `Button.tsx` (`variant: 'primary' | 'ghost'`), `Input.tsx` (labeled input + error message, `forwardRef` so it works with React Hook Form's `register()`), `FormError.tsx` (form-level error line). Used by `features/auth`'s forms and `widgets/app-header`.
- `shared/hooks`, `shared/utils`, `shared/constants`: not created yet, same rule — created as content actually exists.
- `store/` (root-level, not yet created): client-only global UI state (theme, sidebar, modal visibility). Server state always stays in the query layer via `shared/api/services`, never mirrored here.

## Module Structure
Folders are created as they're needed, not scaffolded empty ahead of time. `widgets/` and `features/` now each hold one real folder (`app-header`, `auth`); `shared/` has `api/` and `lib/` so far. See `CLAUDE.md` for the full target tree.

## Why This Structure
- Centralizing `queries`/`services`/`axios` under `shared/api` (instead of duplicating an API slice per feature) keeps token handling, cache keys, and the Axios instance in one place — there's exactly one place to look for "how does this app talk to the backend."
- `entities` vs `features` split keeps domain data shape (`User`, later `Task`, `Project`) separate from the UI/business logic that manipulates it, without forcing an API layer per feature.
- Matches the backend's domain split (auth, workspace, project, task, comment) so the two codebases stay easy to reason about together.
- A single Axios instance + interceptor pair keeps token handling (attach, refresh, retry) in one place instead of scattered per-request.

## API Integration
- Base URL and any environment-specific config should come from Vite env vars (`import.meta.env`), not hardcoded.
- The backend's auth endpoints this frontend integrates with: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`. See `backend/.claude/progress.md` for their exact contracts.
- CORS is already enabled backend-side for the Vite dev origin (`http://localhost:5173` by default, via `CORS_ORIGIN`).
