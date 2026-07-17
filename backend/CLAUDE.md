# CLAUDE.md

## Project Overview

This document is the long-term development guide for the backend of the task tracker project.
It contains only backend-related guidance and should be used as the reference for implementation decisions in the backend workspace.

## Tech Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT
- Docker
- Nodemailer (Gmail transport) — `modules/email`

## Backend Architecture

The backend should follow a layered architecture:

Controller -> Service -> Repository -> Prisma

### Layer responsibilities
- Controller: handle HTTP requests and responses only. Keep controllers thin.
- Service: contain business logic, validation rules, and orchestration of use cases.
- Repository: encapsulate database access and Prisma queries.
- Prisma: provide persistence and database interaction.

Business logic must stay in services. Repositories should not contain application logic.

## Module Structure

Each feature module should follow a consistent structure:

- controllers/: HTTP controllers
- services/: business logic
- repositories/: Prisma access layer
- dto/: request and response DTOs
- entities/ or interfaces/: shared domain types
- guards/: authentication and authorization guards
- decorators/: custom decorators
- exceptions/: custom exception classes

A module should be self-contained and focused on one responsibility.

## Database Rules

- Use PostgreSQL with Prisma.
- Use Prisma Migrations for schema changes.
- Only repositories may access Prisma directly.
- Never expose Prisma models directly through the API.
- Keep database mapping and query logic inside repositories.

## API Conventions

- Follow RESTful API design.
- Use DTOs for request and response data.
- Return consistent HTTP status codes.
- Validate incoming data before it reaches services.
- Use standardized error handling and meaningful error messages.

## Security Rules

- Hash passwords before storing them.
- Use JWT for authentication.
- Store secrets and configuration in environment variables.
- Validate all input aggressively.
- Never expose sensitive fields such as passwords or tokens in API responses.

## Coding Standards

Follow Clean Code and SOLID principles.

- Keep classes small and focused.
- Prefer constructor dependency injection.
- Use TypeScript strict mode.
- Prefer readability over cleverness.
- Write code that is easy to test and extend.

## Development Workflow

Every backend task should follow this workflow:

1. Explain the implementation plan.
2. Wait for approval if the task requires it.
3. Implement only the requested scope.
4. Explain what changed.
5. Explain the architectural decisions made.
6. Suggest the next logical step.
7. Never implement future milestones unless explicitly requested.

## Current Milestone

Current version: V5 Comments + Task Status History (backend done, frontend caught up).

- V1 Authentication: done — registration, login, JWT issuance/validation, refresh token rotation, logout, current-user endpoint.
- V2 Workspaces: done — Workspace CRUD (create, list-mine, get-by-id, update, delete), `WorkspaceMember` with `OWNER`/`MEMBER` roles auto-created on workspace creation, ownership/membership-based authorization, and member invitation (`POST`/`GET /workspaces/:id/members`). Both workspace listing (`GET /workspaces`) and project listing (`GET /workspaces/:id/projects`) are page/limit paginated (`page`, `limit`, default `20`/max `100`) returning `{ items, total, page, limit, totalPages }` — every list endpoint in the API is paginated in one of the two shapes (page/limit here and for Projects; cursor/keyset for Tasks, see below).
- V3 Projects: done — Project CRUD nested under `/workspaces/:workspaceId/projects`. Authorization (not explicitly spec'd, a reasonable default applied): any workspace member can create/read; only the project's creator or the workspace owner can update/delete.
- V4 Tasks: done, including pagination — Task CRUD nested under `/workspaces/:workspaceId/projects/:projectId/tasks`, with a `TaskStatus` enum (`TODO`/`IN_PROGRESS`/`DONE`), a `TaskPriority` enum (`LOW`/`MEDIUM`/`HIGH`), and optional assignee (validated as a workspace member). Authorization (not explicitly spec'd, a default applied): any workspace member can create/read/update; only the creator or workspace owner can delete. `GET .../tasks` is cursor (keyset) paginated — `status`/`priority`/`assigneeId` filters, `cursor`/`limit` (default `20`/max `100`), sorted `createdAt DESC, id DESC` for a deterministic order, returning `{ items, nextCursor }` shaped for the frontend's `useInfiniteQuery`. Frontend UI built for all of the above, including a Kanban board with per-status-column infinite scroll and the paginated project list.
- V5 Comments + Task Status History: done — Comment CRUD nested under `/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments` (any member create/read; author-or-workspace-owner update/delete), and `TaskHistory` — a read-only `GET .../tasks/:taskId/history` log of every status transition (`oldStatus`, `newStatus`, `changedBy`, `changedAt`), written automatically and atomically alongside the task row whenever `TasksService.update` detects an actual status change (no-op on same-status or non-status updates — verified no spurious entries). Frontend UI: clicking a Kanban card now opens a Task Detail modal (fields + status history + comment thread) instead of the old Edit-only modal.
- V5 follow-up — User display name: done — `User.name` (required at registration, `RegisterDto`) is now returned everywhere a user's identity is exposed (`UserResponseDto`, `WorkspaceMemberResponseDto.user`, `CommentResponseDto.author`, `TaskHistoryResponseDto.changedBy`), so the frontend can show names instead of emails. Pre-existing rows were backfilled from their email's local-part (no profile-edit endpoint exists yet to let those users set a real name).
- `EmailModule` (`modules/email`): a reusable `EmailService.sendEmail(to, subject, html, text?)` over Gmail/`nodemailer`, registered globally in `AppModule`. Infrastructure only — added ahead of any feature that needs it, not yet called anywhere. Config lives on `AppConfig.email` (`EMAIL_FROM`/`EMAIL_TOKEN` env vars); `EMAIL_TOKEN` must be a Gmail app password, not the account password.
