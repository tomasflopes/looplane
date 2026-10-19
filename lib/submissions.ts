import { findChallenge } from "@/lib/challenges/loader";
import { db } from "@/lib/db";
import { getChallengeStatus } from "@/lib/progress";
import { challengeRng } from "@/lib/rng";
import { numericDirection, validateAnswer } from "@/lib/validation";
import "server-only";

export type SubmissionResult = {
  ok: boolean;
  message: string;
  cooldownSeconds?: number;
  solved?: boolean;
};

const COOLDOWN_MS = 5000;

export async function submitAnswer(
  studentId: string,
  challengeVersionId: string,
  answer: string,
): Promise<SubmissionResult> {
  return db
    .$transaction(
      async (tx) => {
        // `$executeRaw`, not `$queryRaw`: pg_advisory_xact_lock returns void and
        // Prisma cannot deserialize a void column.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${studentId + ":" + challengeVersionId}))`;
        const version = await tx.challengeVersion.findUniqueOrThrow({
          where: { id: challengeVersionId },
          include: { challenge: true },
        });
        const status = await getChallengeStatus(
          tx,
          studentId,
          challengeVersionId,
        );
        if (status.kind !== "AVAILABLE")
          return {
            ok: false,
            message:
              status.kind === "SOLVED"
                ? "This challenge has already been solved."
                : "This challenge is not available yet.",
          };
        let progress = await tx.challengeProgress.findUnique({
          where: {
            studentId_challengeVersionId: { studentId, challengeVersionId },
          },
        });
        const now = new Date();
        if (progress?.lastAttemptAt) {
          const left =
            COOLDOWN_MS - (now.getTime() - progress.lastAttemptAt.getTime());
          if (left > 0)
            return {
              ok: false,
              message: `Try again in ${Math.ceil(left / 1000)} seconds.`,
              cooldownSeconds: Math.ceil(left / 1000),
            };
        }
        const definition = await findChallenge(version.challenge.slug);
        const generated = definition.generate(
          challengeRng(studentId, version.challenge.slug, version.version),
        );
        const expected = definition.solve(generated.value);
        const correct = validateAnswer(
          answer,
          expected,
          definition.metadata.output.type,
        );
        const attempt = (progress?.attempts ?? 0) + 1;
        if (!progress)
          progress = await tx.challengeProgress.create({
            data: {
              studentId,
              challengeId: version.challengeId,
              challengeVersionId,
              attempts: attempt,
              firstAttemptAt: now,
              lastAttemptAt: now,
              solvedAt: correct ? now : null,
            },
          });
        else
          progress = await tx.challengeProgress.update({
            where: { id: progress.id },
            data: {
              attempts: attempt,
              lastAttemptAt: now,
              ...(correct ? { solvedAt: now } : {}),
            },
          });
        await tx.submission.create({
          data: {
            studentId,
            challengeId: version.challengeId,
            challengeVersionId,
            answer,
            correct,
            attemptNumber: attempt,
          },
        });
        if (correct)
          return {
            ok: true,
            solved: true,
            message: "Correct! The solution is now available.",
          };
        const numericType = definition.metadata.output.type;
        const numeric = numericType === "integer" || numericType === "decimal";
        const direction =
          attempt >= 3 && numeric
            ? numericDirection(answer, expected, numericType)
            : null;
        if (direction === "equivalent")
          return {
            ok: true,
            message:
              "Right number, wrong format. Submit the exact value the program would print.",
          };
        return {
          ok: true,
          message:
            direction === "high"
              ? "Your answer is too high."
              : direction === "low"
                ? "Your answer is too low."
                : "Incorrect.",
        };
      },
      // READ COMMITTED on purpose. The advisory lock above is what serialises a
      // student's submissions; under SERIALIZABLE the snapshot is taken before
      // the lock is granted, so the waiter reads stale progress and Postgres
      // aborts it with 40001.
    )
    .catch((error) => {
      console.error("Submission failed", error);
      return {
        ok: false,
        message: "Unable to process this submission. Please try again.",
      };
    });
}
