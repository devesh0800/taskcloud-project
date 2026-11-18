-- AlterTable
ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "evaluationComments" TEXT;
ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "grades_isPublished_idx" ON "grades"("isPublished");
