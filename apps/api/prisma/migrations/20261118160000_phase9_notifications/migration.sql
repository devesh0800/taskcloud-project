-- AlterTable
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "link" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
