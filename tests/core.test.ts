import { describe, expect, it } from "vitest";

import { generate as fastest } from "@/challenges/f1/001-fastest-lap/generator";
import { solve as fastestSolve } from "@/challenges/f1/001-fastest-lap/reference-solution";
import { generate as points } from "@/challenges/f1/002-championship-points/generator";
import { solve as pointsSolve } from "@/challenges/f1/002-championship-points/reference-solution";
import { generate as bus } from "@/challenges/mobility/001-bus-stops/generator";
import { solve as busSolve } from "@/challenges/mobility/001-bus-stops/reference-solution";
import { validateDefinitions } from "@/lib/challenges/authoring";
import { loadChallenges } from "@/lib/challenges/loader";
import { createRngFromSeed } from "@/lib/rng";
import {
  normalizeAnswer,
  numericDirection,
  validateAnswer,
} from "@/lib/validation";

const seed = (n: number) => {
  const b = Buffer.alloc(32);
  b.writeUInt32BE(n);
  return b;
};
describe("deterministic generation", () => {
  it("repeats a seed and stays within bounds", () => {
    const a = createRngFromSeed(seed(1)),
      b = createRngFromSeed(seed(1));
    expect(Array.from({ length: 10 }, () => a.nextInt(2, 5))).toEqual(
      Array.from({ length: 10 }, () => b.nextInt(2, 5)),
    );
    for (let i = 0; i < 30; i++)
      expect(a.nextInt(-4, 4)).toBeGreaterThanOrEqual(-4);
  });
  it("changes normally with a new seed", () =>
    expect(createRngFromSeed(seed(1)).nextFloat()).not.toBe(
      createRngFromSeed(seed(2)).nextFloat(),
    ));
  it("reference solvers match generated values", () => {
    for (const [g, s] of [
      [fastest, fastestSolve],
      [points, pointsSolve],
      [bus, busSolve],
    ] as const) {
      const input = g(createRngFromSeed(seed(42)));
      expect(s(input.value)).toMatch(/^\d+$/);
    }
  });
});
describe("output validation", () => {
  it("normalizes only final newlines", () => {
    expect(validateAnswer("42\n", "42")).toBe(true);
    expect(validateAnswer(" 42", "42")).toBe(false);
    expect(normalizeAnswer("42\r\n")).toBe("42");
  });
  it("rejects malformed typed numeric output", () => {
    expect(validateAnswer("42abc", "42", "integer")).toBe(false);
    expect(validateAnswer("4.2", "4.2", "decimal")).toBe(true);
  });
  it("uses strict numeric feedback", () => {
    expect(numericDirection("43", "42", "integer")).toBe("high");
    expect(numericDirection("41", "42", "integer")).toBe("low");
    expect(numericDirection("42abc", "42", "integer")).toBeNull();
  });
  it("reports a numerically equal answer as equivalent, not low", () => {
    expect(numericDirection("4.20", "4.2", "decimal")).toBe("equivalent");
    expect(numericDirection("42", "42", "integer")).toBe("equivalent");
    expect(validateAnswer("4.20", "4.2", "decimal")).toBe(false);
  });
});
describe("challenge authoring", () => {
  it("accepts the shipped challenges", async () => {
    const definitions = await loadChallenges();
    expect(validateDefinitions(definitions)).toEqual([]);
  });
  it("reports a gap in the sequence numbers of a theme", async () => {
    const definitions = await loadChallenges();
    const first = definitions[0];
    const broken = [
      ...definitions,
      {
        ...first,
        metadata: { ...first.metadata, id: "gap-1", theme: "gap-theme" },
      },
      {
        ...first,
        metadata: {
          ...first.metadata,
          id: "gap-2",
          theme: "gap-theme",
          sequence: 3,
        },
      },
    ];
    const problems = validateDefinitions(broken);
    expect(problems.some((p) => p.includes("gap in its numbering"))).toBe(true);
  });
});
