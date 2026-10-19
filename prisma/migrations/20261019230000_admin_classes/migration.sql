-- AlterTable
ALTER TABLE "ChallengeProgress" ADD COLUMN     "firstAttemptAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Class_name_key" ON "Class"("name");

-- Backfill the first attempt time from the submission history.
UPDATE "ChallengeProgress" AS p
SET "firstAttemptAt" = s."firstAttempt"
FROM (
  SELECT "studentId", "challengeVersionId", MIN("submittedAt") AS "firstAttempt"
  FROM "Submission"
  GROUP BY "studentId", "challengeVersionId"
) AS s
WHERE p."studentId" = s."studentId"
  AND p."challengeVersionId" = s."challengeVersionId";
