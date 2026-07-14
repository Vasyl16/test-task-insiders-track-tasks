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

## Current Task
- Axios/token layer is done and verified. No pages, routing, providers, or the query/cache library exist yet.

## Next Steps
- Confirm the query/cache library and React Router before building `providers/QueryProvider.tsx`, `routes/router.tsx`, and the login/register pages.

## Important Notes
- Keep all future work scoped to the current milestone unless explicitly requested.
- Update this file after each completed task.
- The backend (`../backend`) already has CORS enabled for this frontend's dev origin (`http://localhost:5173` by default).
