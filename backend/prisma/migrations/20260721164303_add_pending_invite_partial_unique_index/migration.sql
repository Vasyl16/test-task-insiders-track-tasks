-- Prisma's schema DSL has no way to express a *partial* unique index
-- (`@@unique` always applies across the whole table), but the actual
-- invariant we need is narrower: only one PENDING invite per
-- (workspaceId, invitedUserId) at a time - ACCEPTED/DECLINED history for
-- the same pair must stay unrestricted, since re-inviting someone after
-- they declined (or were removed and re-invited later) is a real,
-- already-supported flow. A plain table-wide @@unique([workspaceId,
-- invitedUserId]) would incorrectly block that. Postgres supports exactly
-- this via a partial unique index, so it's added here as raw SQL instead
-- of in schema.prisma.
CREATE UNIQUE INDEX "WorkspaceInvite_pending_workspaceId_invitedUserId_key"
ON "WorkspaceInvite" ("workspaceId", "invitedUserId")
WHERE "status" = 'PENDING';