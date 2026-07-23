-- DropIndex
DROP INDEX "Comment_taskId_createdAt_idx";

-- DropIndex
DROP INDEX "TaskHistory_taskId_changedAt_idx";

-- CreateIndex
CREATE INDEX "Comment_taskId_createdAt_id_idx" ON "Comment"("taskId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "TaskHistory_taskId_changedAt_id_idx" ON "TaskHistory"("taskId", "changedAt", "id");
