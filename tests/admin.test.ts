import { describe, expect, it } from "vitest";

import { listClasses, listStudents, listSubmissionRows } from "@/lib/admin";
import { database } from "@/lib/container";
import { createInviteCode, hashInviteCode } from "@/lib/invites";
import { submitAnswer } from "@/lib/submissions";

import { currentVersionOf, makeStudent } from "./helpers";

/**
 * These exercise the teacher-facing views against a real database.
 *
 * Run them against a disposable database:
 *   TEST_DATABASE_URL=postgresql://... pnpm exec vitest run tests/admin.test.ts
 */
const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("admin views", () => {
  it("reports an unredeemed invite as not used, not redeemed", async () => {
    const student = await makeStudent("pending");
    await database.invites.create({
      studentId: student.id,
      codeHash: hashInviteCode(createInviteCode()),
    });

    const row = (await listStudents()).find((s) => s.id === student.id);
    expect(row?.invitedAt).toBeTruthy();
    expect(row?.inviteUsedAt).toBeNull();
  });

  it("records the class a student belongs to", async () => {
    const student = await makeStudent("member");
    const klass = await database.classes.create(`Class ${Date.now()}`);
    await database.classes.addMember(klass.id, student.id);

    const classes = await listClasses();
    expect(classes.find((c) => c.id === klass.id)?.memberIds).toContain(
      student.id,
    );
    expect(
      (await listStudents()).find((s) => s.id === student.id)?.classIds,
    ).toContain(klass.id);
  });

  it("shows tries and timestamps for a solved challenge", async () => {
    const student = await makeStudent("solver");
    const version = await currentVersionOf("f1-001");

    const find = async () =>
      (await listSubmissionRows()).find(
        (r) =>
          r.studentId === student.id && r.challengeId === version.challengeId,
      );
    const before = await find();
    expect(before?.status).toBe("not-started");
    expect(before?.attempts).toBe(0);

    expect((await submitAnswer(student.id, version.id, "1")).ok).toBe(true);

    const after = await find();
    expect(after?.attempts).toBe(1);
    expect(after?.firstAttemptAt).toBeTruthy();
    expect(after?.lastAttemptAt).toBeTruthy();
    expect(after?.status).toBe("attempted");
  });
});
