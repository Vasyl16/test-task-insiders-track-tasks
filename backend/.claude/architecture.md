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
Each feature module should follow a consistent structure:

- controllers/
- services/
- repositories/
- dto/
- interfaces/ or entities/
- guards/
- decorators/
- exceptions/

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
