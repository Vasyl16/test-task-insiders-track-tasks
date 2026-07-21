# Backend Architecture

## Architecture Style
The backend should follow this layered flow:

Controller -> Service -> Repository -> Prisma

## Layer Responsibilities
- Controller: handle HTTP requests and responses only. Keep controllers thin.
- Service: contain business logic, orchestration, and use-case rules.
- Repository: encapsulate Prisma queries and database access.
- Prisma: provide persistence and database interaction.

## Module Structure
The project uses a module-based structure to keep the backend scalable and organized.

Suggested structure:

src/
├── main.ts
├── app.module.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── workspaces/
│   ├── projects/
│   ├── tasks/
│   ├── comments/
│   └── history/
├── common/
├── config/
└── prisma/

Each feature module should include only the folders it needs, such as:
- controllers/
- services/
- repositories/
- dto/
- interfaces/ or types/
- guards/
- decorators/
- utils/

## Why This Structure
- It matches NestJS module-based conventions.
- It keeps feature code isolated and easier to maintain.
- It supports future growth without forcing a large refactor.
- It preserves the layered architecture and keeps business logic out of controllers.

## Database Rules
- Use PostgreSQL with Prisma.
- Use Prisma Migrations for schema changes.
- Only repositories may access Prisma directly.
- Never expose Prisma models through the API.

## Data Model
- `User`, `RefreshToken` — V1 Authentication (see `backend/CLAUDE.md`).
- `Workspace`, `WorkspaceMember` (role: `OWNER` | `MEMBER`), `Project`, `Task` (status: `TODO` | `IN_PROGRESS` | `DONE`; priority: `LOW` | `MEDIUM` | `HIGH`, defaults `MEDIUM`) — V2/V3/V4 domain models. All have full APIs now.
  - A `Workspace` has one `owner` (`User`) and many `members` (`WorkspaceMember`, unique per `(workspaceId, userId)`) and many `projects`.
  - A `Project` belongs to exactly one `Workspace` and has one `creator` (`User`, via `createdBy`), and many `tasks`.
  - A `Task` belongs to exactly one `Project`, has one `creator` (`createdBy`) and one optional `assignee` (`assigneeId`).
  - Deleting a `Workspace`/`Project` cascades down to their `WorkspaceMember`/`Project`/`Task` rows. Deleting a `User` who still owns a workspace or created a project/task is blocked (`Restrict`) — authorship must be resolved first. Deleting a `User` who is merely assigned to a task just clears the assignment (`SetNull`) — assignment is mutable, unlike authorship. Deleting a `User` cascades only for rows that are pure links with no meaning on their own (`RefreshToken`, `WorkspaceMember`).

## Workspace Module (V2)
- `workspaces.repository.ts`: Prisma-only. `createWithOwner` wraps the workspace insert and its `OWNER` `WorkspaceMember` insert in one `$transaction`, so a workspace never exists without its owner's membership row (same atomicity pattern as `AuthRepository.rotateRefreshToken`). Also `findById`, `findManyForUser`, `findMembership`, `findUserByEmail`, `addMember`, `findMembersForWorkspace`, `update`, `delete`.
- `workspaces.service.ts`: all authorization logic lives here, via composable private helpers — existence check (404), membership check (403), owner-role check (403). Every mutating/reading-by-id operation checks existence before authorization, so a non-existent workspace always yields 404 regardless of who's asking.
- `workspaces.controller.ts`: `@UseGuards(JwtAuthGuard)` at the controller level (every route needs auth here, unlike Auth's public/protected mix) — `JwtAuthGuard` works from any module without importing `AuthModule`, since Passport registers the `"jwt"` strategy globally once `AuthModule` is loaded anywhere in the app.
- Permission model: `OWNER` can create/read/update/delete/invite; `MEMBER` can read only; non-members get no access.
- Member invitation: `POST /workspaces/:id/members` (owner-only, by email — 404 if no user has that email, 409 if already a member, otherwise added as `MEMBER`) and `GET /workspaces/:id/members` (member-or-owner read). There's no accept/decline step — since there's no `Invitation` model (deliberately not added, per the V2/V3 schema instruction), this adds the membership row directly rather than a pending-invite flow.

## Project Module (V3)
- Nested entirely under a workspace: `workspaces/:workspaceId/projects`. Mirrors the Workspace module's controller → service → repository pattern.
- `projects.repository.ts`: also owns `findWorkspaceById`/`findWorkspaceMembership` — small deliberate duplicates of the equivalent `WorkspacesRepository` methods, kept to avoid one module's repository depending on another's. Now a third module (Tasks) needs the exact same pair of checks — still not extracted into a shared service, since each duplicate is a two-line Prisma call; worth revisiting if a fourth consumer shows up.
- `projects.service.ts` permission model (not explicitly spec'd — a reasonable default, flagged for review): any workspace member can create/read projects; only the project's **creator or the workspace owner** can update/delete. Existence is always checked before authorization, same as Workspaces.

## Task Module (V4)
- Nested one level deeper than Project: `workspaces/:workspaceId/projects/:projectId/tasks`. Same controller → service → repository pattern, extended by one more existence check (`getWorkspaceOrThrow` → `getProjectOrThrow` → `getTaskOrThrow`, each 404 before the next layer's check).
- Permission model (not explicitly spec'd — a reasonable default, flagged for review) is deliberately **more permissive than Project's**: any workspace member can create, read, *and update* a task (status changes, reassignment, edits) since a task board is meant to be worked on collaboratively day-to-day. Delete is still restricted to the task's creator or the workspace owner — the one destructive action stays gated even though routine editing doesn't.
- Assigning a task validates the assignee is a workspace member (`400` if not) via the same `findWorkspaceMembership` check Workspace/Project already use. Unassignment is explicit (`assigneeId: null`), distinct from "don't change the assignee" (field omitted) — `class-validator`'s `@IsOptional()` treats both `null` and `undefined` as "skip validation," so both DTO states pass through correctly to a single optional-nullable field.
- `priority` (`TaskPriority`, defaults `MEDIUM`) was added later, prompted by a frontend request for a Kanban board with priority indicators — same optional-enum-field pattern as `status`. A plain additive column with a default needed no backfill.

## Shared Infrastructure
The backend now includes shared infrastructure for future growth:
- ConfigModule for environment variables.
- Global ValidationPipe for request validation.
- Global exception filter for consistent error responses.
- PrismaModule and PrismaService as the persistence foundation.
- Module folders for upcoming feature areas.

## API Architecture
- Use REST APIs.
- Use DTOs for request and response contracts.
- Keep business rules in services, not controllers.
- Validate input before it reaches services.
