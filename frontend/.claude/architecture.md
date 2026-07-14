# Frontend Architecture

## Architecture Style
Data flow: Component → `api/services` hook → `api/queries` or `api/mutations` → `api/axios` instance → backend API.

## Layer Responsibilities
- `api/axios`: the single Axios instance, interceptors (attach access token, handle 401 refresh-and-retry), and the token manager (sole owner of token storage).
- `api/queries` / `api/mutations`: plain, domain-scoped functions that call the API. No React or UI concerns.
- `api/services`: domain-scoped hooks that wrap queries/mutations for components to consume.
- `api/queryKeys.ts`: one shared cache key factory, so queries and mutations invalidate consistently.
- `components/`: `ui` (pure presentation), `common` (shared, non-primitive), `forms` (form components + validation).
- `pages/`: route-level composition, grouped by area (auth, dashboard, workspace, project, task).
- `layouts/`: shared page shells (e.g. authenticated app shell with nav).
- `routes/`: router config plus `ProtectedRoute`/`PublicRoute` guards.
- `providers/`: app-wide context providers composed once near the root.
- `store/`: client-only global state. Server state stays in the query layer, never mirrored here.
- `hooks/`, `context/`, `constants/`, `types/`, `utils/`: generic reusable code not tied to one domain.

## Module Structure
Folders are created as they're needed, not scaffolded empty ahead of time. See `CLAUDE.md` for the full target tree.

## Why This Structure
- Keeps server-state fetching (queries/mutations) separate from client-only state (store) and from presentation (components).
- Matches the backend's domain split (auth, workspace, project, task, comment) so the two codebases stay easy to reason about together.
- A single Axios instance + interceptor pair keeps token handling (attach, refresh, retry) in one place instead of scattered per-request.

## API Integration
- Base URL and any environment-specific config should come from Vite env vars (`import.meta.env`), not hardcoded.
- The backend's auth endpoints this frontend integrates with: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`. See `backend/.claude/progress.md` for their exact contracts.
- CORS is already enabled backend-side for the Vite dev origin (`http://localhost:5173` by default, via `CORS_ORIGIN`).
