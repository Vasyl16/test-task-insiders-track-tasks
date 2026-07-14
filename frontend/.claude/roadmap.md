# Roadmap

## Version Plan
- V1 Authentication UI
- V2 Task Management UI
- V3 Advanced Features UI

## Current Milestone
V1 Authentication UI

### Planned V1 features
- Axios instance + interceptors + token manager, wired to the backend's JWT access/refresh flow
- Login and register pages/forms
- Protected vs public routing (`ProtectedRoute`, `PublicRoute`)
- Auth provider/context exposing the current user app-wide
- Current-user view backed by `GET /auth/me`
- Logout

## Future Versions
### V2 Task Management UI
- Workspace / project / task views
- Task CRUD forms
- Task status flow UI

### V3 Advanced Features UI
- Comments
- Notifications
- Role-based UI (show/hide by permission)
