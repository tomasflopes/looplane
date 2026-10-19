import { describe, expect, it } from "vitest";

import { listClasses, listStudents, listSubmissionRows } from "@/lib/admin";
import { db } from "@/lib/db";
import { createInviteCode, hashInviteCode } from "@/lib/invites";
import { submitAnswer } from "@/lib/submissions";

/**
 * These exercise the teacher-facing views against a real database.
 *
 * Run them against a disposable database:
 *   TEST_DATABASE_URL=postgresql://... pnpm exec vitest run tests/admin.test.ts
 */
const enabled = Boolean(process.env.TEST_DATABASE_URL);

async function makeStudent(name: string, email: string) {
  return db.user.create({
    data: { name, email, role: "STUDENT" },
  });
}

describe.skipIf(!enabled)("admin views", () => {
  it("reports an unredeemed invite as not used, not redeemed", async () => {
    const email = `invite-${Date.now()}@example.com`;
    const student = await makeStudent("Invite Pending", email);
    await db.inviteCode.create({
      data: {
        codeHash: hashInviteCode(createInviteCode()),
        studentId: student.id,
      },
    });

    const listed = await listStudents();
    const row = listed.find((s) => s.id === student.id);
    expect(row?.invitedAt).toBeTruthy();
    expect(row?.inviteUsedAt).toBeNull();
  });

  it("records the class a student belongs to", async () => {
    const email = `class-${Date.now()}@example.com`;
    const student = await makeStudent("Class Member", email);
    const klass = await db.class.create({
      data: { name: `Class ${Date.now()}` },
    });
    await db.classMembership.create({
      data: { classId: klass.id, studentId: student.id },
    });

    const classes = await listClasses();
    expect(classes.find((c) => c.id === klass.id)?.memberIds).toContain(
      student.id,
    );
    const listed = await listStudents();
    expect(listed.find((s) => s.id === student.id)?.classIds).toContain(
      klass.id,
    );
  });

  it("shows tries and timestamps for a solved challenge", async () => {
    const email = `tries-${Date.now()}@example.com`;
    const student = await makeStudent("Solver", email);
    const version = await db.challengeVersion.findFirstOrThrow({
      where: { challenge: { slug: "f1-001" } },
    });

    const rows = await listSubmissionRows();
    const before = rows.find(
      (r) =>
        r.studentId === student.id && r.challengeId === version.challengeId,
    );
    expect(before?.status).toBe("not-started");
    expect(before?.attempts).toBe(0);

    const result = await submitAnswer(student.id, version.id, "1");
    expect(result.ok).toBe(true);

    const after = (await listSubmissionRows()).find(
      (r) =>
        r.studentId === student.id && r.challengeId === version.challengeId,
    );
    expect(after?.attempts).toBe(1);
    expect(after?.firstAttemptAt).toBeTruthy();
    expect(after?.lastAttemptAt).toBeTruthy();
    expect(after?.status).toBe("attempted");
  });
});
