import { integerRange } from "@/lib/challenges/primitives";
import type { DeterministicRng } from "@/lib/rng";

export function generate(rng: DeterministicRng) {
  const stops = integerRange(rng, 4, 8, 1, 35);
  return { value: stops, display: `${stops.length}\n${stops.join(" ")}` };
}
