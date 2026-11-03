import { describe, expect, it } from "vitest";

import { findChallenge } from "@/lib/challenges/loader";
import { database } from "@/lib/container";
import { redeemInvite } from "@/lib/credentials";
import { getChallengeStatus } from "@/lib/progress";
import { challengeRng } from "@/lib/rng";
import { createStudent } from "@/lib/students";
import { submitAnswer } from "@/lib/submissions";

import { currentVersionOf, makeStudent, uniqueEmail } from "./helpers";

/**
 * These exercise the paths that only break under a real database: the
 * per-student serialisation, the single-use invite, and the availability
 * rules. They go through the ports, so they are also the contract any new
 * database adapter has to pass.
 *
 * Run them against a disposable database:
 *   TEST_DATABASE_URL=postgresql://... pnpm exec vitest run tests/integration.test.ts
 */
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("submission flow", () => {
  it("accepts the reference answer and records the attempt", async () => {
    const student = await makeStudent("flow");
    const version = await currentVersionOf("f1-001");
    const definition = await findChallenge("f1-001");
    const generated = definition.generate(
      challengeRng(student.id, "f1-001", version.version),
    );
    const expected = definition.solve(generated.value);

    const result = await submitAnswer(student.id, version.id, expected);
    expect(result.ok).toBe(true);
    expect(result.solved).toBe(true);

    const [stored] = await database.submissions.listForStudent(student.id);
    expect(stored?.correct).toBe(true);
    expect(stored?.attemptNumber).toBe(1);
  });

  it("rejects a wrong answer without failing the request", async () => {
    const student = await makeStudent("wrong");
    const version = await currentVersionOf("f1-001");
    const result = await submitAnswer(student.id, version.id, "-1");
    expect(result.ok).toBe(true);
    expect(result.solved).toBeFalsy();
    expect(result.message).toBe("Incorrect.");
  });

  it("serialises concurrent submissions instead of failing them", async () => {
    const student = await makeStudent("concurrent");
    const version = await currentVersionOf("f1-001");

    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        submitAnswer(student.id, version.id, "1"),
      ),
    );
    // Serialisation means every request is handled: one attempt is recorded
    // and the rest hit the cooldown.
    expect(results.every((r) => !r.message.includes("Unable to process"))).toBe(
      true,
    );
    const stored = await database.submissions.listForStudent(student.id);
    expect(stored.length).toBe(1);
    expect(stored[0].attemptNumber).toBe(1);
  });
});

describe.skipIf(!enabled)("invite codes", () => {
  it("can only be redeemed once, even under a race", async () => {
    const { inviteCode } = await createStudent({
      name: "race",
      email: uniqueEmail("race"),
    });
    const outcomes = await Promise.allSettled([
      redeemInvite(inviteCode),
      redeemInvite(inviteCode),
      redeemInvite(inviteCode),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
  });
});

describe.skipIf(!enabled)("availability", () => {
  it("does not throw when a theme has a gap in its sequence numbers", async () => {
    const theme = await database.themes.findBySlug("f1");
    const sequence = 5000 + Math.floor(Math.random() * 1000);
    const challenge = await database.challenges.create({
      slug: `gap-${sequence}-${crypto.randomUUID()}`,
      themeId: theme!.id,
      sequence,
    });
    const version = await database.challenges.createVersion({
      challengeId: challenge.id,
      version: 1,
      title: "Gap",
      subtitle: "x",
      difficulty: "beginner",
      publishedAt: new Date("2020-01-01T00:00:00Z"),
      sourcePath: "/tmp/gap",
      contentHash: null,
      inputType: "integer-list",
      outputType: "integer",
    });
    const status = await getChallengeStatus(database, "nobody", version.id);
    expect(status.kind).toBe("AVAILABLE");
  });
});
