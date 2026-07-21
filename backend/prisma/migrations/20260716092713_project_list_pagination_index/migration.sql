-- DropIndex
DROP INDEX "Project_workspaceId_idx";

-- CreateIndex
CREATE INDEX "Project_workspaceId_createdAt_idx" ON "Project"("workspaceId", "createdAt");
