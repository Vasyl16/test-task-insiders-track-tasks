# Progress

## Completed Tasks
- Scaffolded via `npm create vite@latest` (React + TypeScript), then stripped of the default template's demo content down to a minimal shell (`f16cb8e`).
- Tailwind CSS v4 added via `@tailwindcss/vite` (`2f52821`).
- Frontend documentation structure created (`CLAUDE.md` + `.claude/`), mirroring the backend's documentation-driven workflow, independent of `backend/CLAUDE.md`.
- **V1 Auth UI — Step 1: Axios instance, interceptors, token manager.**
  - Installed `axios` (only — the query/cache library and React Router are deferred to the steps that actually use them, per `CLAUDE.md`'s "confirm before installing" note; their naming in the target tree strongly implies TanStack Query and React Router, but that wasn't explicitly confirmed, so nothing beyond Axios was added yet).
  - `api/axios/token-manager.ts`: get/set/clear access + refresh tokens, backed by `localStorage`, as the single place token storage happens.
  - `api/axios/instance.ts`: one configured Axios instance, base URL from `VITE_API_URL` (new `.env`/`.env.example`, defaults to `http://localhost:3000/api`).
  - `api/axios/interceptors.ts`: request interceptor attaches `Authorization: Bearer <accessToken>`; response interceptor catches `401`, uses a bare (non-instance) `axios.post` to call `/auth/refresh` so the refresh call itself can't recursively trigger the interceptor, deduplicates concurrent refreshes behind a single in-flight promise (important given the backend rotates refresh tokens — two simultaneous refreshes would otherwise invalidate each other), then retries the original request once with the new token. Clears tokens and gives up if there's no refresh token or the refresh itself fails.
  - Added `.env`/`.env.example` (`VITE_API_URL`) and gitignored `.env`, matching the backend's env-file pattern.
  - Verified end-to-end in a real headless browser (Playwright, installed ephemerally via `npx`/`npm install --no-save` — not added to `package.json`) against the live backend: unauthenticated `GET /auth/me` → 401; `POST /auth/register` → 201; authenticated `GET /auth/me` → 200 with the correct email; a deliberately corrupted access token still resulted in 200 with the correct email (proving the interceptor's catch-401-refresh-retry cycle actually works, not just compiles); confirmed the refresh token was rotated. The temporary verification code that drove this (a `useEffect` in `App.tsx` calling the API and rendering the results) was removed afterward — `App.tsx` is back to the plain shell; this kind of ad-hoc API call doesn't belong in a page component per `CLAUDE.md`'s API conventions.
- **V1 Auth UI — Step 2: Application foundation.**
  - Libraries confirmed and installed: `react-router` (v8 — the unified package; `react-router-dom` is now the legacy/frozen name, so imports are from `react-router` directly), `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers` (the standard RHF↔Zod glue, added now since it's needed the moment real forms exist).
  - `api/queryKeys.ts`: minimal cache-key factory, currently just `auth.me`.
  - `providers/QueryProvider.tsx`: `QueryClient` with `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 60_000`.
  - `context/AuthContext.ts` + `hooks/useAuth.ts` + `providers/AuthProvider.tsx`: split into three files (not one) because ESLint's `react-refresh/only-export-components` rejects a component file that also exports a hook — this is the correct fix, not a suppression, and matches `architecture.md`'s own separation of `context/`, `hooks/`, and `providers/`. `AuthProvider` hydrates `user` via `GET /auth/me` (through TanStack Query) only if an access token already exists in `localStorage` at mount; exposes `user`, `isAuthenticated`, `isLoading`, `logout`. `logout` calls `POST /auth/logout` with the stored refresh token, then clears tokens and evicts the cached query.
  - Known limitation, deliberately deferred: `hasToken` is only read once at mount, not reactive. Once login/register are implemented (next step), they'll need to invalidate `queryKeys.auth.me` after storing new tokens for `isAuthenticated` to flip without a full page reload.
  - `routes/ProtectedRoute.tsx` / `PublicRoute.tsx`: redirect to `/login` / `/dashboard` respectively based on `useAuth()`, rendering nothing while the initial `/auth/me` check is in flight.
  - `routes/router.tsx`: `/login` + `/register` under `PublicRoute` → `AuthLayout`; `/dashboard` under `ProtectedRoute` → `DashboardLayout`; `/` redirects to `/dashboard` (which itself redirects to `/login` when unauthenticated).
  - `layouts/AuthLayout.tsx` (centered card) and `layouts/DashboardLayout.tsx` (header with email + logout button, `<Outlet />` body) — minimal Tailwind styling, no real design system yet.
  - `pages/auth/{LoginPage,RegisterPage}.tsx` and `pages/dashboard/DashboardPage.tsx`: placeholder headings only, no forms — as instructed.
  - `App.tsx` now composes `QueryProvider > AuthProvider > RouterProvider`; this is also how the Axios instance/interceptors get pulled into the startup path (imported transitively via `AuthProvider`), satisfying "integrate the Axios client into application startup" without needing a separate bootstrap step.
  - Verified: `tsc -b` and `npm run build` both clean, and a real headless-browser check (no backend needed, since these are unauthenticated placeholder-page checks) confirmed all four navigation cases: `/` → `/login`, `/register` → renders "Register", `/dashboard` → `/login` (guard works), `/login` → renders "Login". No page errors.

## Current Task
- Application foundation (routing, providers, layouts, placeholder pages) is done and verified. Login/register forms are not implemented yet, per this step's explicit scope.

## Next Steps
- Build the actual login and register forms (React Hook Form + Zod validation), wired to `POST /auth/login` / `POST /auth/register` — likely via new `api/mutations/auth.mutations.ts` + `api/services/useAuth.ts`, per `architecture.md`'s layering (not directly in the page components).
- Once login/register can acquire tokens, fix the `AuthProvider` limitation noted above (invalidate `queryKeys.auth.me` after a successful login/register instead of only checking `localStorage` at mount).

## Important Notes
- Keep all future work scoped to the current milestone unless explicitly requested.
- Update this file after each completed task.
- The backend (`../backend`) already has CORS enabled for this frontend's dev origin (`http://localhost:5173` by default).
