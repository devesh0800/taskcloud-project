-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipStatus') THEN
        CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'REMOVED');
    END IF;
END$$;

-- AlterTable classes
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "semester" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "section" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "classes_isArchived_idx" ON "classes"("isArchived");

-- AlterTable class_members
ALTER TABLE "class_members" ADD COLUMN IF NOT EXISTS "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "class_members" ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_members_status_idx" ON "class_members"("status");
