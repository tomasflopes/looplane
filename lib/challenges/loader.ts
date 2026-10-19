import fs from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import { z } from "zod";

import { getChallengeModules } from "./modules";
import type { ChallengeDefinition, ChallengeMetadata } from "./types";

const metaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive(),
  theme: z.string().regex(/^[a-z0-9-]+$/),
  sequence: z.number().int().positive(),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  publishedAt: z.string().datetime(),
  input: z.object({
    type: z.enum([
      "integer-list",
      "string",
      "string-list",
      "character-list",
      "integer-matrix",
    ]),
  }),
  output: z.object({ type: z.enum(["integer", "decimal", "text"]) }),
});
const root = path.join(process.cwd(), "challenges");
let cached: ChallengeDefinition[] | undefined;
export async function loadChallenges(force = false) {
  if (cached && !force) return cached;
  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((theme) =>
      fs
        .readdirSync(path.join(root, theme.name), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => path.join(root, theme.name, d.name)),
    );
  const definitions = await Promise.all(
    dirs.map(async (directory) => {
      for (const file of [
        "challenge.yaml",
        "problem.md",
        "solution.md",
        "generator.ts",
        "reference-solution.ts",
      ])
        if (!fs.existsSync(path.join(directory, file)))
          throw new Error(`Challenge is missing ${file}`);
      const metadata = metaSchema.parse(
        parse(fs.readFileSync(path.join(directory, "challenge.yaml"), "utf8")),
      ) as ChallengeMetadata;
      const { generator, solver } = getChallengeModules(
        path.relative(root, directory).split(path.sep).join("/"),
      );
      if (
        typeof generator.generate !== "function" ||
        typeof solver.solve !== "function"
      )
        throw new Error(`Challenge ${metadata.id} has invalid module exports`);
      return {
        metadata,
        directory,
        problem: fs.readFileSync(path.join(directory, "problem.md"), "utf8"),
        solution: fs.readFileSync(path.join(directory, "solution.md"), "utf8"),
        generate: generator.generate,
        solve: solver.solve,
      } satisfies ChallengeDefinition;
    }),
  );
  const ids = new Set<string>();
  for (const d of definitions) {
    if (ids.has(d.metadata.id))
      throw new Error(`Duplicate challenge id: ${d.metadata.id}`);
    ids.add(d.metadata.id);
  }
  cached = definitions.sort(
    (a, b) =>
      a.metadata.theme.localeCompare(b.metadata.theme) ||
      a.metadata.sequence - b.metadata.sequence,
  );
  return cached;
}
export async function findChallenge(slug: string) {
  const result = (await loadChallenges()).find((c) => c.metadata.id === slug);
  if (!result) throw new Error("Challenge definition not found");
  return result;
}
