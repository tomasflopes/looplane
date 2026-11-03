import { findChallenge } from "@/lib/challenges/loader";
import { currentVersion } from "@/lib/challenges/versions";
import { database } from "@/lib/container";
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
  return database
    .transaction(
      async (r) => {
        const version = await r.challenges.findVersion(challengeVersionId);
        if (!version) throw new Error("Challenge version not found");
        // A page left open across a republish still points at the old version.
        const current = currentVersion(
          await r.challenges.listVersions(version.challengeId),
        );
        if (current && current.id !== version.id)
          return {
            ok: false,
            message:
              "This challenge was updated. Reload the page to get the new version.",
          };
        const status = await getChallengeStatus(
          r,
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
        const progress = await r.progress.find(studentId, challengeVersionId);
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
        const recorded = await r.progress.recordAttempt({
          studentId,
          challengeId: version.challengeId,
          challengeVersionId,
          now,
          solved: correct,
        });
        const attempt = recorded.attempts;
        await r.submissions.create({
          studentId,
          challengeId: version.challengeId,
          challengeVersionId,
          answer,
          correct,
          attemptNumber: attempt,
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
      // One student's submissions to one challenge run one at a time, and the
      // others wait. (The Postgres adapter does this with an advisory lock at
      // READ COMMITTED: under SERIALIZABLE the snapshot is taken before the
      // lock is granted, so a waiter would read stale progress and abort.)
      { serializeOn: `${studentId}:${challengeVersionId}` },
    )
    .catch((error) => {
      console.error("Submission failed", error);
      return {
        ok: false,
        message: "Unable to process this submission. Please try again.",
      };
    });
}
