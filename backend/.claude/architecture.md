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

## API Architecture
- Use REST APIs.
- Use DTOs for request and response contracts.
- Keep business rules in services, not controllers.
- Validate input before it reaches services.
