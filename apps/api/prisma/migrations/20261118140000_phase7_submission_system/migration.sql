-- AlterTable
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "attemptNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "submission_attempts" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "answerText" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_attempts_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "submission_files" ADD COLUMN IF NOT EXISTS "attemptId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "submission_attempts_submissionId_idx" ON "submission_attempts"("submissionId");
CREATE INDEX IF NOT EXISTS "submission_attempts_attemptNumber_idx" ON "submission_attempts"("attemptNumber");
CREATE INDEX IF NOT EXISTS "submission_files_attemptId_idx" ON "submission_files"("attemptId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'submission_attempts_submissionId_fkey'
    ) THEN
        ALTER TABLE "submission_attempts" ADD CONSTRAINT "submission_attempts_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'submission_files_attemptId_fkey'
    ) THEN
        ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "submission_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
