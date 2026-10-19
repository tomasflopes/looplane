import {
  contentHash,
  relativeSourcePath,
  validateDefinitions,
} from "../lib/challenges/authoring";
import { loadChallenges } from "../lib/challenges/loader";
import { db } from "../lib/db";

async function main() {
  const command = process.argv[2];
  const definitions = await loadChallenges(true);

  const problems = validateDefinitions(definitions);
  if (problems.length) {
    for (const problem of problems) console.error(`  - ${problem}`);
    throw new Error(
      `${problems.length} challenge definition problem(s) found. Fix them before syncing.`,
    );
  }

  if (command === "validate") {
    console.log(`Validated ${definitions.length} challenge definitions.`);
    return;
  }
  if (command !== "sync") throw new Error("Use validate or sync");

  for (const definition of definitions) {
    const m = definition.metadata;
    const theme = await db.theme.findUnique({ where: { slug: m.theme } });
    if (!theme)
      throw new Error(
        `Challenge ${m.id} refers to unknown theme ${m.theme}. Seed themes first.`,
      );
    const existingChallenge = await db.challenge.findUnique({
      where: { slug: m.id },
    });
    if (
      existingChallenge &&
      (existingChallenge.themeId !== theme.id ||
        existingChallenge.sequence !== m.sequence)
    )
      throw new Error(
        `Challenge ${m.id} already exists with a different theme or sequence. Create a new challenge id instead of moving an existing one.`,
      );
    const challenge =
      existingChallenge ??
      (await db.challenge.create({
        data: { slug: m.id, themeId: theme.id, sequence: m.sequence },
      }));
    const existing = await db.challengeVersion.findUnique({
      where: {
        challengeId_version: { challengeId: challenge.id, version: m.version },
      },
    });
    const data = {
      title: m.title,
      subtitle: m.subtitle,
      difficulty: m.difficulty,
      publishedAt: new Date(m.publishedAt),
      sourcePath: relativeSourcePath(definition),
      contentHash: contentHash(definition),
      inputType: m.input.type,
      outputType: m.output.type,
    };
    if (existing) {
      const changed = (
        ["title", "subtitle", "difficulty", "publishedAt"] as const
      ).some((key) => String(existing[key]) !== String(data[key]));
      if (changed)
        throw new Error(
          `Published challenge version ${m.id}@${m.version} is immutable; create a new version.`,
        );
      if (existing.contentHash && existing.contentHash !== data.contentHash)
        throw new Error(
          `Challenge ${m.id}@${m.version} changed on disk (problem, solution, generator or solver). Published versions are immutable; create a new version.`,
        );
      await db.challengeVersion.update({
        where: { id: existing.id },
        data: { sourcePath: data.sourcePath, contentHash: data.contentHash },
      });
    } else
      await db.challengeVersion.create({
        data: { challengeId: challenge.id, version: m.version, ...data },
      });
  }
  console.log(`Synchronized ${definitions.length} challenge definitions.`);
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
