import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import { findChallenge } from "@/lib/challenges/loader";
import { db } from "@/lib/db";
import { getChallengeStatus } from "@/lib/progress";
import { challengeRng } from "@/lib/rng";
import { submitAnswer } from "@/lib/submissions";

/**
 * These exercise the paths that only break under a real database: the
 * advisory lock, the single-use invite, and the availability rules.
 *
 * Run them against a disposable database:
 *   createdb challenge_platform_test
 *   TEST_DATABASE_URL=postgresql://... pnpm exec vitest run tests/integration.test.ts
 */
const enabled = Boolean(process.env.TEST_DATABASE_URL);

async function makeStudent(label: string) {
  return db.user.create({
    data: {
      name: label,
      email: `${label}-${crypto.randomUUID()}@example.com`,
      role: "STUDENT",
    },
  });
}

describe.skipIf(!enabled)("submission flow", () => {
  it("accepts the reference answer and records the attempt", async () => {
    const student = await makeStudent("flow");
    const version = await db.challengeVersion.findFirstOrThrow({
      where: { challenge: { slug: "f1-001" } },
    });
    const definition = await findChallenge("f1-001");
    const generated = definition.generate(
      challengeRng(student.id, "f1-001", version.version),
    );
    const expected = definition.solve(generated.value);

    const result = await submitAnswer(student.id, version.id, expected);
    expect(result.ok).toBe(true);
    expect(result.solved).toBe(true);

    const stored = await db.submission.findFirst({
      where: { studentId: student.id },
    });
    expect(stored?.correct).toBe(true);
    expect(stored?.attemptNumber).toBe(1);
  });

  it("rejects a wrong answer without failing the request", async () => {
    const student = await makeStudent("wrong");
    const version = await db.challengeVersion.findFirstOrThrow({
      where: { challenge: { slug: "f1-001" } },
    });
    const result = await submitAnswer(student.id, version.id, "-1");
    expect(result.ok).toBe(true);
    expect(result.solved).toBeFalsy();
    expect(result.message).toBe("Incorrect.");
  });

  it("serialises concurrent submissions instead of failing them", async () => {
    const student = await makeStudent("concurrent");
    const version = await db.challengeVersion.findFirstOrThrow({
      where: { challenge: { slug: "f1-001" } },
    });

    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        submitAnswer(student.id, version.id, "1"),
      ),
    );
    // The advisory lock plus READ COMMITTED means every request is handled:
    // one attempt is recorded and the rest hit the cooldown.
    expect(results.every((r) => !r.message.includes("Unable to process"))).toBe(
      true,
    );
    const stored = await db.submission.findMany({
      where: { studentId: student.id },
    });
    expect(stored.length).toBe(1);
    expect(stored[0].attemptNumber).toBe(1);
  });
});

describe.skipIf(!enabled)("invite codes", () => {
  it("can only be redeemed once, even under a race", async () => {
    const student = await makeStudent("invite");
    const code = crypto.randomBytes(12).toString("hex").toUpperCase();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    await db.inviteCode.create({ data: { codeHash, studentId: student.id } });

    const claim = () =>
      db.$transaction(async (tx) => {
        const invite = await tx.inviteCode.findUnique({
          where: { codeHash },
          include: { student: true },
        });
        if (!invite || (invite.expiresAt && invite.expiresAt <= new Date()))
          throw new Error("That invite code is invalid or expired.");
        const claimed = await tx.inviteCode.updateMany({
          where: { id: invite.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (claimed.count !== 1)
          throw new Error("That invite code has already been used.");
        return invite.student;
      });

    const outcomes = await Promise.allSettled([claim(), claim(), claim()]);
    const accepted = outcomes.filter((o) => o.status === "fulfilled");
    expect(accepted).toHaveLength(1);
  });
});

describe.skipIf(!enabled)("availability", () => {
  it("does not throw when a theme has a gap in its sequence numbers", async () => {
    const theme = await db.theme.findFirstOrThrow({ where: { slug: "f1" } });
    const sequence = 5000 + Math.floor(Math.random() * 1000);
    const challenge = await db.challenge.create({
      data: {
        slug: `gap-${sequence}-${crypto.randomUUID()}`,
        themeId: theme.id,
        sequence,
      },
    });
    const version = await db.challengeVersion.create({
      data: {
        challengeId: challenge.id,
        version: 1,
        title: "Gap",
        subtitle: "x",
        difficulty: "beginner",
        publishedAt: new Date("2020-01-01T00:00:00Z"),
        sourcePath: "/tmp/gap",
        inputType: "integer-list",
        outputType: "integer",
      },
    });
    const status = await getChallengeStatus(db, "nobody", version.id);
    expect(status.kind).toBe("AVAILABLE");
  });
});
