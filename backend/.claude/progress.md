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
- **V1 Auth — Step 2: Dependencies & JWT config.**
  - Installed `bcrypt`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` (+ `@types/bcrypt`, `@types/passport-jwt`).
  - Replaced the single `jwtSecret` config field with a structured `JwtConfig` (`accessSecret`, `accessExpiresIn`, `refreshSecret`, `refreshExpiresIn`) on `AppConfig`, sourced from new env vars: `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`. Updated `.env` and `.env.example` accordingly.
  - `JwtModule`/`PassportModule` are intentionally not registered yet — that's deferred to the steps that actually use them (token issuance, then the guard/strategy), to keep this step to config only.
  - Verified: `tsc --noEmit` passes clean, app boots successfully.
- **V1 Auth — Step 3: Registration.**
  - `AuthRepository`: `findByEmail`, `createUser`.
  - `AuthService.register`: rejects duplicate emails with `ConflictException` (409), hashes the password with bcrypt (10 salt rounds) before persisting.
  - `AuthController`: `POST /auth/register`, validated by `RegisterDto`, returns a `UserResponseDto` (id, email, createdAt — password never leaves the service layer).
  - Note: had to run `prisma generate` explicitly — the client in `node_modules/.prisma/client` had gone stale (empty, no `User`/`RefreshToken` delegates) after the earlier dependency reinstall cycle, even though schema/migrations were already correct.
  - Verified end-to-end against the live Neon DB via `curl`: successful registration (201, hashed password confirmed in the DB row), duplicate email (409), invalid payload (400 with per-field validation messages). Test row cleaned up afterward.
  - Follow-up fix (after step 4 landed): registration now auto-issues a token pair too, via the same `issueTokens` used by login, so the client is authenticated immediately after signup without a separate login call. Response shape changed to `RegisterResponseDto` (`user`, `accessToken`, `refreshToken`). Verified with `curl` against the live DB.
- **V1 Auth — Step 4: Login + JWT/refresh token issuance.**
  - Registered `JwtModule.registerAsync` in `AuthModule`, configured with the access secret/expiry from `AppConfig.jwt`.
  - `AuthService.login`: looks up the user, verifies the password with `bcrypt.compare`, and returns a generic `UnauthorizedException('Invalid credentials')` for both "no such user" and "wrong password" (avoids user-enumeration).
  - Token issuance (`issueTokens`): access token signed via `JwtService` (payload `{ sub, email }`); refresh token is a 64-byte random hex string (opaque, not a JWT) — only its SHA-256 hash is persisted via `AuthRepository.createRefreshToken`, with `expiresAt` computed from `jwt.refreshExpiresIn` using the `ms` package. Opaque + hashed was chosen over a signed JWT for the refresh token so it can be looked up and revoked by hash in step 6/7 without needing a second verify path.
  - Added `AuthTokensDto` (`accessToken`, `refreshToken`) as the login response shape.
  - `AuthController`: `POST /auth/login`, validated by `LoginDto`.
  - Verified end-to-end against the live Neon DB via `curl`: successful login (201, valid JWT access token + 128-char hex refresh token), wrong password (401), nonexistent user (401, same message as wrong password). Confirmed the `RefreshToken` row stores only the SHA-256 hash (not the raw token) with the correct 7-day `expiresAt`. Test data cleaned up afterward.
- **V1 Auth — Step 5: JWT guard + Passport strategy + current user endpoint.**
  - `AuthRepository.findById` added (strategy validates against the DB, not just the token signature).
  - `JwtStrategy` (`modules/auth/strategies/jwt.strategy.ts`): extracts the bearer token, verifies it against `jwt.accessSecret`, then re-fetches the user by `payload.sub` and throws `UnauthorizedException` if they no longer exist — a token survives password/account changes only as long as the user row does. Returns a `UserResponseDto` (no password) as `request.user`.
  - `JwtAuthGuard` placed in `common/guards` (thin `AuthGuard('jwt')` subclass) since it's a generic, reusable guard other feature modules will use later, not auth-specific like the strategy.
  - `CurrentUser` param decorator added in `common/decorators`, reading `request.user`.
  - `AuthModule` now imports `PassportModule` and registers `JwtStrategy` as a provider.
  - `AuthController`: `GET /auth/me`, guarded by `@UseGuards(JwtAuthGuard)`, returns the current user via `@CurrentUser()`.
  - Verified end-to-end against the live Neon DB: valid token → 200 with user data; no token → 401; malformed token → 401; token signed with the wrong secret → 401; valid signature but for a since-deleted user → 401 with `"Invalid credentials"` (confirms the DB re-check, not just signature verification). Test data cleaned up afterward.
- **V1 Auth — Step 6: Refresh token rotation.**
  - `AuthRepository.findRefreshTokenByHash` and `rotateRefreshToken` (the latter revokes the old row and inserts the new one inside a single `prisma.$transaction`, so a rotation can't partially apply).
  - Refactored `AuthService`'s token-issuance internals: `signAccessToken` and `createRefreshTokenMaterial` are now shared between `issueTokens` (register/login) and the new `refresh` flow, instead of being duplicated.
  - `AuthService.refresh`: hashes the incoming token, rejects if unknown, revoked, or expired (`401 "Invalid refresh token"`), re-checks the owning user still exists, then rotates — issuing a brand-new access + refresh pair and revoking the presented one so it can't be reused.
  - Added `RefreshTokenDto` and `AuthController`: `POST /auth/refresh`.
  - Verified end-to-end against the live Neon DB: valid refresh rotates successfully (201, new token pair); re-presenting the now-revoked old refresh token → 401; the newly-issued refresh token works; a garbage/unknown token → 401. Confirmed via direct DB read that the rotation chain is exactly `revoked → revoked → active` across three rows. Test data cleaned up afterward.
- **V1 Auth — Step 7: Logout.**
  - `AuthRepository.revokeRefreshToken(id)` — sets `revokedAt`.
  - `AuthService.logout(userId, dto)`: hashes the presented refresh token, and rejects (`401 "Invalid refresh token"`) unless it exists, belongs to the calling user, and isn't already revoked — then revokes it. The ownership check exists so an authenticated user can't revoke someone else's session even if they somehow obtained their refresh token.
  - `AuthController`: `POST /auth/logout`, guarded by `@UseGuards(JwtAuthGuard)` (must present a valid access token) and requires the refresh token to revoke in the body. Returns `204 No Content`.
  - Known/expected limitation: logout revokes the refresh token only — the current access token remains valid until it naturally expires (stateless JWT, no server-side blocklist). This is a standard tradeoff for this architecture, mitigated by the short access-token TTL (15m default); not something this step attempts to solve.
  - Verified end-to-end against the live Neon DB: logout without an access token → 401; another authenticated user attempting to revoke a token that isn't theirs → 401 (cross-user protection confirmed); valid logout → 204; the just-revoked refresh token then fails `/auth/refresh` → 401; double-logout with the same token → 401 (already revoked); the access token issued alongside the revoked refresh token still works on `/auth/me` (expected, see limitation above). Test data cleaned up afterward.
- **V1 Auth — Step 8: Error-handling polish.**
  - `RegisterDto`/`LoginDto` email: normalized via `class-transformer`'s `@Transform` (trim + lowercase) before validation, so `"  User@Example.com "` and `"user@example.com"` are treated as the same account. Without this, a user could accidentally register duplicate accounts by casing alone, or register with one casing and then have login "silently" fail-looking like wrong credentials for a case variant.
  - `RegisterDto`/`LoginDto` password: added `@MaxLength(72)`, since bcrypt silently ignores input bytes beyond 72 — without a cap, two different long passwords could hash identically, or the true validated length wouldn't match what's actually checked.
  - `RefreshTokenDto.refreshToken`: added `@IsNotEmpty()` — previously an empty string passed `@IsString()` and fell through to a business-logic 401 instead of a validation 400.
  - `AuthController`: `login` and `refresh` now explicitly return `200 OK` (`@HttpCode(HttpStatus.OK)`) instead of Nest's default `201 Created` for `@Post()` — they don't create a resource, only `register` (201) and the implicit resource creation inside `refresh`'s rotation do.
  - Verified end-to-end against the live Neon DB: registering, then re-registering with a whitespace/case variant of the same email → 409 (not a silent duplicate); logging in with that variant → 200 with valid tokens; empty-string refresh token → 400 with a field-level validation message (not 401); a 100-character password → 400 (rejected before ever reaching bcrypt). Test data cleaned up afterward.

## Current Task
- V1 Authentication is feature-complete against the original requirements (registration, login, JWT access tokens, refresh tokens with rotation, logout, bcrypt hashing, JWT guard, current-user endpoint, DTO validation, standardized error handling). All 8 planned steps are done. Nothing has been committed since `720dd4a` (steps 1–2) — steps 3–8 are about to be committed together as one unit, since they were implemented back-to-back without intermediate commits this round (unlike steps 1–2, there's no clean checkpoint to split them by).

## Next Steps (V1 Authentication plan)
1. ~~Database foundation: Prisma models + real PrismaService + migration.~~ (done)
2. ~~Install auth dependencies (bcrypt, @nestjs/jwt, @nestjs/passport, passport, passport-jwt) and extend typed config with JWT secrets/TTLs.~~ (done)
3. ~~Registration: repository + service (bcrypt hashing) + controller + safe response DTO.~~ (done)
4. ~~Login + JWT access/refresh token issuance (refresh token hash stored in `RefreshToken`).~~ (done)
5. ~~JWT auth guard + Passport strategy + `GET /auth/me`.~~ (done)
6. ~~Refresh token rotation endpoint.~~ (done)
7. ~~Logout (revoke refresh token).~~ (done)
8. ~~Error-handling polish across auth endpoints.~~ (done)

V1 Authentication milestone complete. Next milestone (V2 Task Management) should only start on explicit request.

## Important Notes
- Keep all future work scoped to the current milestone unless explicitly requested.
- Update this file after each completed task.
- Do not implement more than one step of the V1 Authentication plan per iteration without explicit approval.
