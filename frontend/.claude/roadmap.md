# Roadmap

## Version Plan
Aligned with the backend's actual versioning (`backend/.claude/roadmap.md`), not the original guess of "V2 Task Management UI" — Workspaces and Projects turned out to be their own versions.

- V1 Authentication UI (done)
- V2/V3 Workspace + Project UI (done — create/list/view/delete, plus a full visual redesign; no edit/rename or member-invitation UI yet)
- V4 Task Management UI (done — create/list/view/delete, status updates, assignment)
- V5 Advanced Features UI

## Current Milestone
V4 Task Management UI is functionally complete; picking the next milestone is open.

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

### V4 features (done)
- Project detail page (`/workspaces/:workspaceId/projects/:projectId`, new) showing that project's tasks as numbered ledger rows
- Create-task form (in a modal): title, description, status (defaults `TODO`), assignee (picked from the workspace's members)
- Inline status change directly on each task row (any workspace member can do this, matching the backend's collaborative-update rule)
- Delete a task (creator-or-owner, same pattern as Project)

### Explicitly deferred (not yet built)
- Editing/renaming a workspace, project, or task's title/description (status/assignee updates exist for tasks; full edit forms don't, for any of the three)
- Member invitation UI (backend supports it, and `useWorkspaceMembers` now exists frontend-side from building the assignee dropdown — less new plumbing needed than before, but still not built)

## Future Versions
### V5 Advanced Features UI
- Comments
- Notifications
- Role-based UI (show/hide by permission)
