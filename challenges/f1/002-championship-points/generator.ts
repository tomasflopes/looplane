import { integerRange } from "@/lib/challenges/primitives";
import type { DeterministicRng } from "@/lib/rng";

export function generate(rng: DeterministicRng) {
  const points = integerRange(rng, 4, 8, 0, 25);
  return { value: points, display: `${points.length}\n${points.join(" ")}` };
}
