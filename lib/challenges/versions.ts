/**
 * Which version of a challenge a student is looking at.
 *
 * Repositories return all versions of a challenge (a handful at most), newest
 * first, and the pick happens here, so the rule lives in one place:
 *
 *   - the newest version that is already published wins, so scheduling a v2
 *     for next week does not hide v1 from anyone today;
 *   - if nothing is published yet, the earliest version is returned so the UI
 *     can say when the challenge opens.
 */
export function currentVersion<T extends { publishedAt: Date }>(
  versionsNewestFirst: T[],
  now = new Date(),
): T | undefined {
  return (
    versionsNewestFirst.find((v) => v.publishedAt <= now) ??
    versionsNewestFirst[versionsNewestFirst.length - 1]
  );
}
