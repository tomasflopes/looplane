import type { DeterministicRng } from "@/lib/rng";

export const integers = (
  rng: DeterministicRng,
  count: number,
  min: number,
  max: number,
) => Array.from({ length: count }, () => rng.nextInt(min, max));
export const integerRange = (
  rng: DeterministicRng,
  minLength: number,
  maxLength: number,
  min: number,
  max: number,
) => integers(rng, rng.nextInt(minLength, maxLength), min, max);
export const characters = (
  rng: DeterministicRng,
  count: number,
  alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
) => Array.from({ length: count }, () => rng.pick([...alphabet])).join("");
export const matrix = (
  rng: DeterministicRng,
  rows: number,
  cols: number,
  min: number,
  max: number,
) => Array.from({ length: rows }, () => integers(rng, cols, min, max));
