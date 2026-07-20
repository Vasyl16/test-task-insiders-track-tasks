-- DropIndex
DROP INDEX "Task_projectId_createdAt_idx";

-- DropIndex
DROP INDEX "Task_projectId_status_createdAt_idx";

-- DropIndex
DROP INDEX "WorkspaceInvite_workspaceId_idx";

-- CreateIndex
CREATE INDEX "Task_projectId_status_createdAt_id_idx" ON "Task"("projectId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Task_projectId_createdAt_id_idx" ON "Task"("projectId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_invitedUserId_status_idx" ON "WorkspaceInvite"("workspaceId", "invitedUserId", "status");
