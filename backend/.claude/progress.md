# Progress

## Completed Tasks
- Backend documentation structure created.
- Initial backend project guidance documented.
- Backend folder structure was reorganized around a scalable module-based layout.
- Backend foundation for V1 was set up, including shared infrastructure, global validation, global exception handling, and Prisma service scaffolding.
- Auth module skeleton created with shared DTO and repository folders.
- **V1 Auth — Step 1: Database foundation.**
  - Added `User` and `RefreshToken` Prisma models (`prisma/schema.prisma`), including the relation and indexes needed for refresh token rotation and revocation.
  - Replaced the previous no-op `PrismaService` stub with a real implementation extending the generated `PrismaClient`, wired through the `@prisma/adapter-pg` driver adapter and the typed `AppConfig` (Prisma 7 requires an explicit driver adapter instead of a schema-level datasource `url`).
  - Updated `prisma.config.ts` to load `DATABASE_URL` via `dotenv` and pass it to Prisma Migrate through the new `datasource` config field (schema-level `url` is no longer supported in Prisma 7).
  - Ran the initial migration (`20260714120933_init_user_and_refresh_token`) against the configured Neon Postgres database — schema is now in sync.
  - Removed a redundant `PrismaService` provider registration in `AuthModule` (it now correctly relies on the global `PrismaModule` export instead of spinning up a second DB connection).
  - Verified: `tsc --noEmit` passes clean, and the app boots successfully with a live Prisma connection.

## Current Task
- V1 Authentication — implementing incrementally, one step at a time, per the plan agreed with the user. Step 1 (database foundation) is done; awaiting approval to continue.

## Next Steps (V1 Authentication plan)
1. ~~Database foundation: Prisma models + real PrismaService + migration.~~ (done)
2. Install auth dependencies (bcrypt, @nestjs/jwt, @nestjs/passport, passport, passport-jwt) and extend typed config with JWT secrets/TTLs.
3. Registration: repository + service (bcrypt hashing) + controller + safe response DTO.
4. Login + JWT access/refresh token issuance (refresh token hash stored in `RefreshToken`).
5. JWT auth guard + Passport strategy + `GET /auth/me`.
6. Refresh token rotation endpoint.
7. Logout (revoke refresh token).
8. Error-handling polish across auth endpoints.

## Important Notes
- Keep all future work scoped to the current milestone unless explicitly requested.
- Update this file after each completed task.
- Do not implement more than one step of the V1 Authentication plan per iteration without explicit approval.
