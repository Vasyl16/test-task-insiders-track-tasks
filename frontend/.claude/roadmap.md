# Roadmap

## Version Plan
Aligned with the backend's actual versioning (`backend/.claude/roadmap.md`), not the original guess of "V2 Task Management UI" — Workspaces and Projects turned out to be their own versions.

- V1 Authentication UI (done)
- V2/V3 Workspace + Project UI (done — create/list/view/delete, plus a full visual redesign; no edit/rename or member-invitation UI yet)
- V4 Task Management UI (in progress)
- V5 Advanced Features UI

## Current Milestone
V4 Task Management UI

### V1 features (done)
- Axios instance + interceptors + token manager, wired to the backend's JWT access/refresh flow
- Login and register pages/forms
- Protected vs public routing (`ProtectedRoute`, `PublicRoute`)
- Current-user view backed by `GET /auth/me`
- Logout

### V2/V3 features (done)
- Dashboard lists the current user's workspaces; create-workspace form (in a modal)
- Workspace detail page (`/workspaces/:workspaceId`): name/description, delete (owner-only), back link to dashboard, its projects as numbered ledger rows
- Create-project form (in a modal); delete a project (creator-or-owner)
- Client-side gating of destructive actions based on `ownerId`/`createdBy` (the backend remains the actual enforcement)
- Full visual redesign ("The Ledger Desk" — see `architecture.md`): design tokens, a real `Modal` component, redesigned header/dashboard/workspace page

### V4 features (in progress)
- Backend is done (`../backend`): Task CRUD nested under `/workspaces/:workspaceId/projects/:projectId/tasks`, status enum, optional assignee
- Frontend needs: a project detail page (`/workspaces/:workspaceId/projects/:projectId` — doesn't exist yet), task list/create/status/assignment UI, extending the ledger design system

### Explicitly deferred (not yet built)
- Editing/renaming a workspace or project (API supports it; no UI yet)
- Member invitation UI (backend supports it; deliberately deferred per instruction)

## Future Versions
### V5 Advanced Features UI
- Comments
- Notifications
- Role-based UI (show/hide by permission)
