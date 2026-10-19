import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { ChallengeDefinition } from "./types";

export const SOURCE_FILES = [
  "challenge.yaml",
  "problem.md",
  "solution.md",
  "generator.ts",
  "reference-solution.ts",
];

/**
 * Fingerprint of every file that defines the behaviour of a challenge. Stored
 * with the version so that editing a published challenge is caught instead of
 * silently changing what students are being asked to solve.
 */
export function contentHash(definition: ChallengeDefinition) {
  const hash = crypto.createHash("sha256");
  hash.update(definition.metadata.id);
  hash.update(String(definition.metadata.version));
  for (const file of SOURCE_FILES) {
    const contents = fs.readFileSync(path.join(definition.directory, file));
    hash.update(file);
    hash.update(String(contents.length));
    hash.update(contents);
  }
  return hash.digest("hex");
}

/**
 * Path of a challenge directory relative to the repository root, so the value
 * stored in the database is identical on a laptop, in CI and in a container.
 */
export function relativeSourcePath(definition: ChallengeDefinition) {
  return path
    .relative(process.cwd(), definition.directory)
    .split(path.sep)
    .join("/");
}

/**
 * Authoring invariants that the database cannot express. Violations here are
 * authoring mistakes, not runtime errors, so they are reported before any
 * write happens.
 */
export function validateDefinitions(definitions: ChallengeDefinition[]) {
  const problems: string[] = [];
  const byTheme = new Map<string, ChallengeDefinition[]>();

  for (const definition of definitions) {
    const { metadata } = definition;
    const relative = relativeSourcePath(definition);
    const [directoryTheme, directoryName] = relative.split("/").slice(-2);
    const directorySequence = Number(directoryName.split("-")[0]);
    if (directoryTheme !== metadata.theme)
      problems.push(
        `${metadata.id}: lives under "${directoryTheme}" but declares theme "${metadata.theme}".`,
      );
    if (directorySequence !== metadata.sequence)
      problems.push(
        `${metadata.id}: lives in "${directoryName}" but declares sequence ${metadata.sequence}.`,
      );
    const list = byTheme.get(metadata.theme) ?? [];
    list.push(definition);
    byTheme.set(metadata.theme, list);
  }

  for (const [theme, list] of byTheme) {
    const sequences = list
      .map((d) => d.metadata.sequence)
      .sort((a, b) => a - b);
    const expected = sequences.map((_, index) => index + 1);
    if (sequences.join(",") !== expected.join(","))
      problems.push(
        `Theme "${theme}" has a gap in its numbering (found ${sequences.join(", ")}; expected ${expected.join(", ")}).`,
      );
  }

  return problems;
}
