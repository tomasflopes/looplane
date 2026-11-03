import type { Repositories } from "@/lib/ports";
import "server-only";

export type ChallengeStatus =
  | { kind: "LOCKED_NOT_PUBLISHED"; publishedAt: Date }
  | { kind: "LOCKED_PREVIOUS_CHALLENGE"; previousChallengeId: string }
  | { kind: "AVAILABLE" }
  | { kind: "SOLVED"; solvedAt: Date };

/**
 * Resolve the availability of a single challenge version for a student.
 *
 * Takes the repositories to read through, so a caller inside a transaction
 * passes that transaction's repositories and the check sees the same snapshot
 * as the write that depends on it.
 *
 * The rules, in order:
 *   1. A version published in the future is locked.
 *   2. A version already solved is solved.
 *   3. The first challenge of a theme is always available.
 *   4. Every later challenge requires the previous challenge of the same theme
 *      to be solved, in ANY of its versions. Otherwise publishing a v2 would
 *      re-lock everything after it for students who had already got past it.
 */
export async function getChallengeStatus(
  repositories: Repositories,
  studentId: string,
  challengeVersionId: string,
  now = new Date(),
): Promise<ChallengeStatus> {
  const statuses = await getChallengeStatuses(
    repositories,
    studentId,
    [challengeVersionId],
    now,
  );
  const status = statuses.get(challengeVersionId);
  if (!status) throw new Error("Challenge version not found");
  return status;
}

/**
 * The same rules for many versions at once, with a fixed number of queries,
 * so listing pages do not fan out one request per challenge.
 */
export async function getChallengeStatuses(
  repositories: Repositories,
  studentId: string,
  challengeVersionIds: string[],
  now = new Date(),
): Promise<Map<string, ChallengeStatus>> {
  const statuses = new Map<string, ChallengeStatus>();
  if (!challengeVersionIds.length) return statuses;

  const versions =
    await repositories.challenges.findVersions(challengeVersionIds);
  const progress = await repositories.progress.findMany(
    studentId,
    challengeVersionIds,
  );
  const progressByVersion = new Map(
    progress.map((p) => [p.challengeVersionId, p]),
  );

  const themeIds = [...new Set(versions.map((v) => v.challenge.themeId))];
  const siblings = await repositories.challenges.listByThemes(themeIds);
  const byKey = new Map(siblings.map((c) => [`${c.themeId}:${c.sequence}`, c]));
  const previousOf = (v: (typeof versions)[number]) =>
    byKey.get(`${v.challenge.themeId}:${v.challenge.sequence - 1}`);
  const solvedPrevious = await repositories.progress.solvedChallengeIds(
    studentId,
    versions
      .map((v) => previousOf(v)?.id)
      .filter((id): id is string => Boolean(id)),
  );

  for (const version of versions) {
    if (version.publishedAt > now) {
      statuses.set(version.id, {
        kind: "LOCKED_NOT_PUBLISHED",
        publishedAt: version.publishedAt,
      });
      continue;
    }
    const own = progressByVersion.get(version.id);
    if (own?.solvedAt) {
      statuses.set(version.id, { kind: "SOLVED", solvedAt: own.solvedAt });
      continue;
    }
    if (version.challenge.sequence === 1) {
      statuses.set(version.id, { kind: "AVAILABLE" });
      continue;
    }
    // No previous challenge means this is the head of its own chain. Content
    // authoring keeps sequences contiguous, so this is only a safety net.
    const previous = previousOf(version);
    statuses.set(
      version.id,
      !previous || solvedPrevious.has(previous.id)
        ? { kind: "AVAILABLE" }
        : {
            kind: "LOCKED_PREVIOUS_CHALLENGE",
            previousChallengeId: previous.slug,
          },
    );
  }
  return statuses;
}
