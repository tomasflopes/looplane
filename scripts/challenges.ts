import {
  contentHash,
  relativeSourcePath,
  validateDefinitions,
} from "../lib/challenges/authoring";
import { loadChallenges } from "../lib/challenges/loader";
import { database } from "../lib/container";

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
    const theme = await database.themes.findBySlug(m.theme);
    if (!theme)
      throw new Error(
        `Challenge ${m.id} refers to unknown theme ${m.theme}. Seed themes first.`,
      );
    const existingChallenge = await database.challenges.findBySlug(m.id);
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
      (await database.challenges.create({
        slug: m.id,
        themeId: theme.id,
        sequence: m.sequence,
      }));
    const existing = await database.challenges.findVersionByNumber(
      challenge.id,
      m.version,
    );
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
      await database.challenges.updateVersionSource(existing.id, {
        sourcePath: data.sourcePath,
        contentHash: data.contentHash,
      });
    } else
      await database.challenges.createVersion({
        challengeId: challenge.id,
        version: m.version,
        ...data,
      });
  }
  console.log(`Synchronized ${definitions.length} challenge definitions.`);
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => database.disconnect());
