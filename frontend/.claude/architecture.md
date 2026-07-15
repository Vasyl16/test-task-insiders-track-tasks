# Frontend Architecture

## Architecture Style
A pragmatic Feature-Sliced Design: `app / pages / widgets / features / entities / shared`, combined with a centralized API layer under `shared/api` (rather than splitting HTTP code per-feature).

Data flow: Page → `shared/api/services` hook → `shared/api/queries` → `shared/api/axios` instance → backend API.

## Layer Responsibilities
- `app/`: application-wide composition — root `App.tsx`, `providers/` (context/query providers composed once near the root), `routes/` (router config, `ProtectedRoute`/`PublicRoute` guards), `layouts/` (shared page shells, e.g. the authenticated app shell with nav). Nothing here is domain-specific.
- `pages/`: route-level composition, grouped by area (auth, dashboard, workspace, project, task). Pages compose features/widgets/entities — they never call HTTP directly. `pages/dashboard/DashboardPage.tsx` lists the user's workspaces; `pages/workspace/WorkspacePage.tsx` (route: `/workspaces/:workspaceId`) shows one workspace and its projects.
- `widgets/`: composite UI blocks made of multiple features/entities. First one: `widgets/app-header` (`ui/AppHeader.tsx`) — the dashboard header, composing the current user's email (`entities/user` data, via `shared/api/services`) with the logout action (`features/auth`'s domain, though the action itself is just `useAuth().logout`). Extracted out of `app/layouts/DashboardLayout.tsx` because it's a composite, not a plain shell.
- `features/`: one folder per user-facing capability (`auth`, `workspace`, `project`, `task`, `comment`), each owning only its own business logic — components, hooks, schemas (Zod), types, utils. Folders are created lazily. `features/auth` — `schemas/{loginSchema,registerSchema}.ts` (Zod; register's schema adds a client-only `confirmPassword` with a `.refine` check, never sent to the backend) and `components/{LoginForm,RegisterForm}.tsx`. `features/workspace` and `features/project` — one `{name}Schema.ts` + `Create{Name}Form.tsx` each, same RHF + Zod pattern; no update form yet (deferred). HTTP calls and server-state hooks still live in `shared/api`, not here — a feature folder holds the form/UI logic that *consumes* those hooks.
- `entities/`: domain models shared across features/pages — `entities/user/model/user.ts`, `entities/workspace/model/workspace.ts`, `entities/project/model/project.ts`. Each is a plain type mirroring the backend's response DTO shape.
- `shared/api/axios`: the single Axios instance, interceptors (attach access token, handle 401 refresh-and-retry), and the token manager (sole owner of token storage).
- `shared/api/queries`: one file per domain (`auth.ts`, `workspace.ts`, `project.ts`). Plain HTTP functions only — no React, no query/mutation distinction (e.g. `getMe`, `login`, `register`, `logoutRequest`; `getWorkspaces`, `createWorkspace`, ...). `project.ts`'s functions all take `workspaceId` first since Projects are nested under `/workspaces/:workspaceId/projects`.
- `shared/api/services`: React Query hooks per domain (`useAuth`, `useLogin`, `useRegister`, `useWorkspaces`/`useWorkspace`/`useCreateWorkspace`/..., `useProjects`/`useProject`/...) that wrap `queries` for components to consume. Delete mutations pass `exact: true` to their list invalidation and explicitly `removeQueries` the deleted item's own detail key — see the note below on why.
- `shared/api/queryClient.ts` / `queryKeys.ts`: the shared `QueryClient` instance and cache-key factory, so queries/mutations invalidate consistently.
- `shared/lib`: generic, framework-agnostic helpers with no business logic. First one: `getErrorMessage.ts` (pulls a backend error message out of an Axios error, with a fallback) — kept here rather than in `features/auth` since it isn't auth-specific.
- `shared/ui`: presentation-only primitives with no domain knowledge — `Button.tsx` (`variant: 'primary' | 'ghost' | 'logout' | 'nav'`; `primary` has no baked-in width so it works both full-width, via an explicit `className="w-full"` at the call site, and inline; `nav` is for quiet text actions on the dark desk background, `ghost` for the same on paper), `Input.tsx` (labeled input + error message, `forwardRef` so it works with React Hook Form's `register()`), `FormError.tsx` (form-level error line), `Modal.tsx` (portal-rendered dialog — see the design system section below). Used by `features/auth`/`features/workspace`/`features/project`'s forms and `widgets/app-header`.
- `shared/hooks`, `shared/utils`, `shared/constants`: not created yet, same rule — created as content actually exists.
- `store/` (root-level, not yet created): client-only global UI state (theme, sidebar, modal visibility). Server state always stays in the query layer via `shared/api/services`, never mirrored here.

## Module Structure
Folders are created as they're needed, not scaffolded empty ahead of time. `widgets/` holds `app-header`; `features/` holds `auth`, `workspace`, `project`; `entities/` holds `user`, `workspace`, `project`; `shared/` has `api/`, `lib/`, `ui/`. See `CLAUDE.md` for the full target tree.

## Why This Structure
- Centralizing `queries`/`services`/`axios` under `shared/api` (instead of duplicating an API slice per feature) keeps token handling, cache keys, and the Axios instance in one place — there's exactly one place to look for "how does this app talk to the backend."
- `entities` vs `features` split keeps domain data shape (`User`, `Workspace`, `Project`) separate from the UI/business logic that manipulates it, without forcing an API layer per feature.
- Matches the backend's domain split (auth, workspace, project, task, comment) so the two codebases stay easy to reason about together.
- A single Axios instance + interceptor pair keeps token handling (attach, refresh, retry) in one place instead of scattered per-request.

## API Integration
- Base URL and any environment-specific config should come from Vite env vars (`import.meta.env`), not hardcoded.
- Auth endpoints: `POST /api/auth/{register,login,refresh,logout}`, `GET /api/auth/me`.
- Workspace endpoints: `GET/POST /api/workspaces`, `GET/PATCH/DELETE /api/workspaces/:id`. (Member invitation endpoints exist backend-side but have no frontend yet — deliberately deferred.)
- Project endpoints: `GET/POST /api/workspaces/:workspaceId/projects`, `GET/PATCH/DELETE /api/workspaces/:workspaceId/projects/:id`.
- See `backend/.claude/progress.md` for exact request/response contracts.
- CORS is already enabled backend-side for the Vite dev origin (`http://localhost:5173` by default, via `CORS_ORIGIN`).

## A TanStack Query gotcha worth remembering
`invalidateQueries({ queryKey: [...] })` fuzzy-matches by key **prefix** by default — invalidating `['workspaces']` also matches (and refetches) `['workspaces', id]` and anything nested under it. This is usually fine, but it actively caused a bug: deleting a workspace while its own detail page was still mounted triggered a refetch of that same now-deleted workspace's detail/projects queries, producing spurious 404s. Fixed by (a) passing `exact: true` on delete mutations' list invalidation plus an explicit `removeQueries` for the specific deleted id, and (b) navigating away *before* firing the delete mutation (not after awaiting it) so the page's queries unmount before the mutation's `onSuccess` cache operations run. Either alone wasn't enough — a still-mounted query observer refetches even after its cache entry is removed.

## Visual Design System — "The Ledger Desk"
Built via the `frontend-design` skill (`.claude/skills/frontend-design/`). Subject: workspaces are ledgers, projects are entries logged inside them.
- **Tokens** live in `src/index.css` as a Tailwind v4 `@theme` block — colors (`desk`, `desk-raised`, `paper`, `paper-dim`, `ink`, `brass`/`brass-light`/`brass-deep`, `oxblood`, `fog`) and fonts (`--font-display`: Fraunces, `--font-body`: IBM Plex Sans, `--font-mono`: IBM Plex Mono, loaded via Google Fonts in `index.html`). Any component can use them as ordinary Tailwind utilities (`bg-desk`, `font-display`, etc.) — no separate theming layer.
- **Canvas vs surface**: `bg-desk` (dark ink-navy) is the page background everywhere (`AuthLayout`, `DashboardLayout`); `bg-paper` (warm parchment) is reserved for cards, the auth form, and modals. Don't invert this — a full-bleed paper background was explicitly avoided as one of the "generic AI design" defaults called out by the skill.
- **Signature element**: a small brass corner tab (`absolute -top-2.5 left-* h-5 w-9 rounded-b-sm bg-brass`), repeated on workspace cards, the auth card, and every `Modal`. It's the one deliberately-bold, memorable device — everything else stays quiet, per the skill's restraint principle.
- **Button variants map to background context**, not just visual weight: `primary` (brass fill) works on both paper and desk; `ghost` (quiet ink text) is for on-**paper** contexts (e.g. inside a modal); `nav` (quiet fog text) is for on-**desk** contexts (the header). Using `ghost` directly on `bg-desk` was a real contrast bug caught via screenshot review — that's why `nav` exists as a separate variant instead of a `className` override.
- **Ledger entry numbers must be honest**: anywhere a list is numbered (currently: projects in `WorkspacePage`), the number must reflect genuine chronological order (oldest = `01`), even if the API returns newest-first — reverse the array at the display layer rather than numbering in received order. A numbered marker that doesn't track a real sequence reads as decorative, which the skill explicitly warns against.
- **Motion**: `motion-safe:animate-[...]` (not bare `animate-`) on all entrance animations, so `prefers-reduced-motion` users get no animation, not a lesser one.
- When extending this system to new pages (e.g. the upcoming Task UI), reuse the existing tokens/variants rather than introducing new colors — check `Button`/`Input`/`Modal` first before writing new Tailwind classes from scratch.
