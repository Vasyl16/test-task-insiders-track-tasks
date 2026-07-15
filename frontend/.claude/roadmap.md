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
- Project detail page (`/workspaces/:workspaceId/projects/:projectId`, new) showing that project's tasks as a drag-and-drop Kanban board (`widgets/task-board`), one column per status
- Create-task form (in a modal): title, description, status (defaults `TODO`), priority (defaults `MEDIUM`, via a custom `Listbox` picker), assignee (picked from the workspace's members)
- Drag a card between columns to change status, or open its `Edit` action for a modal form covering the full field set (title, description, status, priority, assignee) — any workspace member can do either, matching the backend's collaborative-update rule. No inline status `<select>` on the card itself (removed per feedback); `Edit` was briefly removed and then restored per further feedback the same session
- Priority shown as a colored top-border on the card plus a text label (green/amber/red for low/medium/high)
- Delete a task (creator-or-owner, same pattern as Project)

### Explicitly deferred (not yet built)
- Editing/renaming a workspace or project's title/description
- Member invitation UI (backend supports it, and `useWorkspaceMembers` now exists frontend-side from building the assignee dropdown — less new plumbing needed than before, but still not built)

## Future Versions
### V5 Advanced Features UI
- Comments
- Notifications
- Role-based UI (show/hide by permission)
