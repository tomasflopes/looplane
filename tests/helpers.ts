import crypto from "node:crypto";

import { database } from "@/lib/container";
import { createStudent } from "@/lib/students";

/** Everything here goes through the ports, so tests do not care which adapter runs. */
export const uniqueEmail = (label: string) =>
  `${label}-${crypto.randomUUID()}@example.com`;

export async function makeStudent(label: string) {
  const { student } = await createStudent({
    name: label,
    email: uniqueEmail(label),
  });
  return student;
}

export async function currentVersionOf(slug: string) {
  const challenge = await database.challenges.findBySlug(slug);
  if (!challenge) throw new Error(`Challenge ${slug} is not synced`);
  return challenge.versions[0];
}

const longAgo = new Date("2020-01-01T00:00:00Z");

/**
 * Two consecutive challenges at the end of a theme, the first with a v1 and a
 * v2 (published at `secondPublishedAt`), the second with a single version.
 */
export async function makeChallengePair(
  themeSlug: string,
  secondPublishedAt: Date,
) {
  const theme = await database.themes.findBySlug(themeSlug);
  if (!theme) throw new Error(`Theme ${themeSlug} is not seeded`);
  const existing = await database.challenges.listByThemes([theme.id]);
  const sequence = Math.max(0, ...existing.map((c) => c.sequence)) + 1;
  const first = await database.challenges.create({
    slug: `pair-${crypto.randomUUID()}`,
    themeId: theme.id,
    sequence,
  });
  const second = await database.challenges.create({
    slug: `pair-${crypto.randomUUID()}`,
    themeId: theme.id,
    sequence: sequence + 1,
  });
  const base = {
    title: "t",
    subtitle: "s",
    difficulty: "beginner" as const,
    sourcePath: "x",
    contentHash: null,
    inputType: "integer-list",
    outputType: "integer",
  };
  const v1 = await database.challenges.createVersion({
    ...base,
    challengeId: first.id,
    version: 1,
    publishedAt: longAgo,
  });
  const v2 = await database.challenges.createVersion({
    ...base,
    challengeId: first.id,
    version: 2,
    publishedAt: secondPublishedAt,
  });
  const next = await database.challenges.createVersion({
    ...base,
    challengeId: second.id,
    version: 1,
    publishedAt: longAgo,
  });
  return { first, v1, v2, next };
}
