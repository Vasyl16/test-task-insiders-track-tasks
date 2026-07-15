# Roadmap

## Version Plan
Aligned with the backend's actual versioning (`backend/.claude/roadmap.md`), not the original guess of "V2 Task Management UI" — Workspaces and Projects turned out to be their own versions.

- V1 Authentication UI (done)
- V2/V3 Workspace + Project UI (done — create/list/view/delete; no edit/rename or member-invitation UI yet)
- V4 Task Management UI
- V5 Advanced Features UI

## Current Milestone
V2/V3 Workspace + Project UI

### V1 features (done)
- Axios instance + interceptors + token manager, wired to the backend's JWT access/refresh flow
- Login and register pages/forms
- Protected vs public routing (`ProtectedRoute`, `PublicRoute`)
- Current-user view backed by `GET /auth/me`
- Logout

### V2/V3 features (done)
- Dashboard lists the current user's workspaces; create-workspace form
- Workspace detail page (`/workspaces/:workspaceId`): name/description, delete (owner-only), its projects
- Create-project form; delete a project (creator-or-owner)
- Client-side gating of destructive actions based on `ownerId`/`createdBy` (the backend remains the actual enforcement)

### Explicitly deferred (not this milestone)
- Editing/renaming a workspace or project (API supports it; no UI yet)
- Member invitation UI (backend supports it; deliberately deferred per instruction)

## Future Versions
### V4 Task Management UI
- Task views within a project
- Task CRUD forms
- Task status flow UI

### V5 Advanced Features UI
- Comments
- Notifications
- Role-based UI (show/hide by permission)
