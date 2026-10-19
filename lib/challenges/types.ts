import type { DeterministicRng } from "@/lib/rng";

export type InputType =
  | "integer-list"
  | "string"
  | "string-list"
  | "character-list"
  | "integer-matrix";
export type OutputType = "integer" | "decimal" | "text";
export interface GeneratedChallengeInput {
  value: unknown;
  display: string;
}
export interface ChallengeMetadata {
  id: string;
  version: number;
  theme: string;
  sequence: number;
  title: string;
  subtitle: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  publishedAt: string;
  input: { type: InputType };
  output: { type: OutputType };
}
export interface ChallengeDefinition {
  metadata: ChallengeMetadata;
  directory: string;
  problem: string;
  solution: string;
  generate(rng: DeterministicRng): GeneratedChallengeInput;
  solve(value: unknown): string;
}
