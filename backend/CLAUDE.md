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

Current version: V4 Task Management (backend done, frontend in progress).

- V1 Authentication: done — registration, login, JWT issuance/validation, refresh token rotation, logout, current-user endpoint.
- V2 Workspaces: done — Workspace CRUD (create, list-mine, get-by-id, update, delete), `WorkspaceMember` with `OWNER`/`MEMBER` roles auto-created on workspace creation, ownership/membership-based authorization, and member invitation (`POST`/`GET /workspaces/:id/members`).
- V3 Projects: done — Project CRUD nested under `/workspaces/:workspaceId/projects`. Authorization (not explicitly spec'd, a reasonable default applied): any workspace member can create/read; only the project's creator or the workspace owner can update/delete.
- V4 Tasks: backend done — Task CRUD nested under `/workspaces/:workspaceId/projects/:projectId/tasks`, with a `TaskStatus` enum (`TODO`/`IN_PROGRESS`/`DONE`) and optional assignee (validated as a workspace member). Authorization (not explicitly spec'd, a default applied): any workspace member can create/read/update; only the creator or workspace owner can delete. Frontend UI not yet built.
