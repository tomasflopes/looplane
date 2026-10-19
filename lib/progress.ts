import type { Prisma, PrismaClient } from "@prisma/client";

import { db } from "@/lib/db";
import "server-only";

export type ChallengeStatus =
  | { kind: "LOCKED_NOT_PUBLISHED"; publishedAt: Date }
  | { kind: "LOCKED_PREVIOUS_CHALLENGE"; previousChallengeId: string }
  | { kind: "AVAILABLE" }
  | { kind: "SOLVED"; solvedAt: Date };

/**
 * Either the pooled client or an open transaction. Passing the transaction
 * keeps availability checks inside the same snapshot as the write that depends
 * on them.
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Resolve the availability of a single challenge version for a student.
 *
 * The rules, in order:
 *   1. A version published in the future is locked.
 *   2. A version already solved is solved.
 *   3. The first challenge of a theme is always available.
 *   4. Every later challenge requires the previous challenge of the same theme
 *      to be solved.
 */
export async function getChallengeStatus(
  client: DbClient,
  studentId: string,
  challengeVersionId: string,
  now = new Date(),
): Promise<ChallengeStatus> {
  const version = await client.challengeVersion.findUniqueOrThrow({
    where: { id: challengeVersionId },
    include: { challenge: true },
  });
  if (version.publishedAt > now)
    return { kind: "LOCKED_NOT_PUBLISHED", publishedAt: version.publishedAt };
  const own = await client.challengeProgress.findUnique({
    where: { studentId_challengeVersionId: { studentId, challengeVersionId } },
  });
  if (own?.solvedAt) return { kind: "SOLVED", solvedAt: own.solvedAt };
  if (version.challenge.sequence === 1) return { kind: "AVAILABLE" };
  const previous = await client.challenge.findFirst({
    where: {
      themeId: version.challenge.themeId,
      sequence: version.challenge.sequence - 1,
    },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  // No previous challenge means this is the head of its own chain. Content
  // authoring keeps sequences contiguous, so this is only a safety net.
  if (!previous) return { kind: "AVAILABLE" };
  const previousVersion = previous.versions[0];
  const progress =
    previousVersion &&
    (await client.challengeProgress.findUnique({
      where: {
        studentId_challengeVersionId: {
          studentId,
          challengeVersionId: previousVersion.id,
        },
      },
    }));
  return progress?.solvedAt
    ? { kind: "AVAILABLE" }
    : { kind: "LOCKED_PREVIOUS_CHALLENGE", previousChallengeId: previous.slug };
}

/**
 * Resolve the availability of many challenge versions with a fixed number of
 * queries, so listing pages do not fan out one request per challenge.
 */
export async function getChallengeStatuses(
  client: DbClient,
  studentId: string,
  challengeVersionIds: string[],
  now = new Date(),
): Promise<Map<string, ChallengeStatus>> {
  const statuses = new Map<string, ChallengeStatus>();
  if (!challengeVersionIds.length) return statuses;

  const versions = await client.challengeVersion.findMany({
    where: { id: { in: challengeVersionIds } },
    include: { challenge: true },
  });
  const byId = new Map(versions.map((v) => [v.id, v]));

  const progress = await client.challengeProgress.findMany({
    where: { studentId, challengeVersionId: { in: challengeVersionIds } },
  });
  const progressByVersion = new Map(
    progress.map((p) => [p.challengeVersionId, p]),
  );

  // Previous challenges of the same theme, at most one per target.
  const needed = new Map<string, string>();
  for (const version of versions) {
    if (version.challenge.sequence <= 1) continue;
    needed.set(
      version.id,
      `${version.challenge.themeId}:${version.challenge.sequence - 1}`,
    );
  }
  const themeIds = [...new Set(versions.map((v) => v.challenge.themeId))];
  const previousChallenges = await client.challenge.findMany({
    where: { themeId: { in: themeIds } },
    orderBy: { sequence: "asc" },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  const previousByKey = new Map(
    previousChallenges.map((c) => [`${c.themeId}:${c.sequence}`, c]),
  );

  const previousVersionIds = [
    ...new Set(
      [...needed.values()]
        .map((key) => previousByKey.get(key)?.versions[0]?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const previousProgress = previousVersionIds.length
    ? await client.challengeProgress.findMany({
        where: {
          studentId,
          challengeVersionId: { in: previousVersionIds },
        },
      })
    : [];
  const solvedPrevious = new Set(
    previousProgress.filter((p) => p.solvedAt).map((p) => p.challengeVersionId),
  );

  for (const id of challengeVersionIds) {
    const version = byId.get(id);
    if (!version) continue;
    if (version.publishedAt > now) {
      statuses.set(id, {
        kind: "LOCKED_NOT_PUBLISHED",
        publishedAt: version.publishedAt,
      });
      continue;
    }
    const own = progressByVersion.get(id);
    if (own?.solvedAt) {
      statuses.set(id, { kind: "SOLVED", solvedAt: own.solvedAt });
      continue;
    }
    if (version.challenge.sequence === 1) {
      statuses.set(id, { kind: "AVAILABLE" });
      continue;
    }
    const key = needed.get(id)!;
    const previousVersion = previousByKey.get(key)?.versions[0];
    if (!previousVersion) {
      statuses.set(id, { kind: "AVAILABLE" });
      continue;
    }
    statuses.set(
      id,
      solvedPrevious.has(previousVersion.id)
        ? { kind: "AVAILABLE" }
        : {
            kind: "LOCKED_PREVIOUS_CHALLENGE",
            previousChallengeId: previousByKey.get(key)!.slug,
          },
    );
  }
  return statuses;
}
