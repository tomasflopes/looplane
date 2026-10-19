import { integerRange } from "@/lib/challenges/primitives";
import type { DeterministicRng } from "@/lib/rng";

export function generate(rng: DeterministicRng) {
  const laps = integerRange(rng, 5, 8, 60, 99);
  return { value: laps, display: `${laps.length}\n${laps.join(" ")}` };
}
