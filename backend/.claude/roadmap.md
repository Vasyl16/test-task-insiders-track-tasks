# Roadmap

## Version Plan
- V1 Authentication (done)
- V2 Workspaces (done)
- V3 Projects (done)
- V4 Task Management
- V5 Advanced Features

## Current Milestone
V2 Workspaces and V3 Projects both complete (schema + full CRUD APIs). Neither has member invitation yet — the only way to join a workspace today is by creating it.

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
- Explicitly deferred (out of this milestone): member invitation/management endpoints

### V3 features (done)
- Project CRUD (create, list-for-workspace, get-by-id, update, delete), nested under `/workspaces/:workspaceId/projects`
- Authorization (not explicitly spec'd, my default — flag if wrong): any workspace member can create/read; only the project's creator or the workspace owner can update/delete

## Future Versions
### V4 Task Management
- Task CRUD operations
- Task ownership and assignment
- Basic task status flow

### V5 Advanced Features
- Notifications
- Role-based access
- Improved validation and error handling
