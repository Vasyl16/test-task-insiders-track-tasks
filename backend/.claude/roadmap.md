# Roadmap

## Version Plan
- V1 Authentication (done)
- V2 Workspaces (done)
- V3 Projects (done)
- V4 Task Management (done, backend + frontend)
- V5 Comments + Task Status History (done, backend + frontend)
- V6 Advanced Features

## Current Milestone
V5 Comments + Task Status History — done, backend + frontend. Every list endpoint in the API (Workspaces, Projects, Tasks) is now paginated; Comments/History are deliberately unpaginated small-collection reads.

### V1 features (done)
- User registration
- User login
- Password hashing
- JWT-based authentication
- Basic auth-protected endpoints

### V2 features (done)
- Workspace CRUD (create, list-mine, get-by-id, update, delete)
- Workspace membership, with an `OWNER` / `MEMBER` role, auto-created on workspace creation
- Authorization: owner-only write access, member-only read access, no access for non-members
- Member invitation (`POST /workspaces/:id/members`, by email — invited users always join as `MEMBER`) and member listing (`GET /workspaces/:id/members`)

### V3 features (done)
- Project CRUD (create, list-for-workspace, get-by-id, update, delete), nested under `/workspaces/:workspaceId/projects`
- Authorization (not explicitly spec'd, my default — flag if wrong): any workspace member can create/read; only the project's creator or the workspace owner can update/delete

### V4 features (done, backend + frontend)
- Task CRUD (create, list-for-project, get-by-id, update, delete), nested under `/workspaces/:workspaceId/projects/:projectId/tasks`
- Status flow via `TaskStatus` enum (`TODO`/`IN_PROGRESS`/`DONE`), optional assignee (validated as a workspace member)
- Priority via `TaskPriority` enum (`LOW`/`MEDIUM`/`HIGH`, defaults `MEDIUM`)
- Authorization (not explicitly spec'd, my default — flag if wrong): any workspace member can create/read/update (collaborative editing); only the task's creator or the workspace owner can delete
- Frontend: a Kanban-style board (project detail page) with drag-and-drop status changes and priority indicators

### V5 features (done, backend + frontend)
- Comment CRUD, nested under `/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments`
- Authorization (not explicitly spec'd, my default — flag if wrong): any workspace member can create/read; only the comment's author or the workspace owner can update/delete
- `TaskHistory`: an automatic, read-only audit log of every status transition (`GET .../tasks/:taskId/history`) — written atomically alongside the task update whenever `TasksService.update` detects an actual status change, never created directly
- Frontend: clicking a Kanban card opens a Task Detail modal (editable fields + status history + comment thread, replacing the old Edit-only modal); the task Status field also moved from a native `<select>` to the app's custom `Listbox` picker (matching priority/assignee)

## Future Versions
### V6 Advanced Features
- Notifications
- Role-based access
- Improved validation and error handling
