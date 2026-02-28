-- Add exam relation to chapters
ALTER TABLE "Chapter" ADD COLUMN "examId" TEXT;

-- Backfill existing chapters without exam
-- (left NULL intentionally)

-- Update unique constraint to be scoped by exam
DROP INDEX IF EXISTS "Chapter_subject_name_key";
CREATE UNIQUE INDEX "Chapter_examId_subject_name_key" ON "Chapter"("examId", "subject", "name");

-- Add index for filtering
CREATE INDEX "Chapter_examId_idx" ON "Chapter"("examId");

-- Add relation to Exam
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
