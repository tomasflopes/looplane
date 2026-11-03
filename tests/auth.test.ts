import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";

import { currentVersion } from "@/lib/challenges/versions";
import { database } from "@/lib/container";
import {
  AuthError,
  authenticate,
  redeemInvite,
  setUserPassword,
} from "@/lib/credentials";
import { getChallengeStatus, getChallengeStatuses } from "@/lib/progress";
import { createStudent, deleteStudent, issueInvite } from "@/lib/students";
import { submitAnswer } from "@/lib/submissions";
import { MAX_FAILURES } from "@/lib/throttle";

import { currentVersionOf, makeChallengePair } from "./helpers";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const unique = (label: string) => `${label}-${crypto.randomUUID()}@Example.com`;

describe("currentVersion", () => {
  const v = (version: number, iso: string) => ({
    version,
    publishedAt: new Date(iso),
  });
  const now = new Date("2026-06-01T00:00:00Z");
  it("prefers the newest version that is already published", () => {
    const list = [v(3, "2027-01-01T00:00:00Z"), v(2, "2026-05-01T00:00:00Z")];
    expect(currentVersion(list, now)?.version).toBe(2);
  });
  it("falls back to the earliest version so the UI can show an opening date", () => {
    const list = [v(2, "2027-02-01T00:00:00Z"), v(1, "2027-01-01T00:00:00Z")];
    expect(currentVersion(list, now)?.version).toBe(1);
  });
});

describe.skipIf(!enabled)("password sign-in", () => {
  it("accepts the right password regardless of email case", async () => {
    const email = unique("case");
    const { student, inviteCode } = await createStudent({ name: "A", email });
    expect(student.email).toBe(email.toLowerCase());
    await redeemInvite(inviteCode);
    await setUserPassword(student.id, "correct horse battery");
    const user = await authenticate(
      email.toUpperCase(),
      "correct horse battery",
    );
    expect(user.id).toBe(student.id);
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const email = unique("same");
    const { student, inviteCode } = await createStudent({ name: "B", email });
    await redeemInvite(inviteCode);
    await setUserPassword(student.id, "correct horse battery");
    const wrong = await authenticate(email, "nope nope nope").catch((e) => e);
    const unknown = await authenticate(unique("ghost"), "whatever").catch(
      (e) => e,
    );
    expect(wrong).toBeInstanceOf(AuthError);
    expect(wrong.message).toBe(unknown.message);
  });

  it("locks an email out after too many failures, even for the right password", async () => {
    const email = unique("lock");
    const { student, inviteCode } = await createStudent({ name: "C", email });
    await redeemInvite(inviteCode);
    await setUserPassword(student.id, "correct horse battery");
    for (let i = 0; i < MAX_FAILURES; i++)
      await authenticate(email, "wrong-password").catch(() => undefined);
    await expect(authenticate(email, "correct horse battery")).rejects.toThrow(
      /Too many failed attempts/,
    );
  });

  it("rejects weak passwords", async () => {
    const { student } = await createStudent({
      name: "D",
      email: unique("weak"),
    });
    await expect(setUserPassword(student.id, "short")).rejects.toThrow(
      /at least 10/,
    );
  });
});

describe.skipIf(!enabled)("invite redemption", () => {
  it("is a credential reset: clears the password and revokes sessions", async () => {
    const email = unique("reset");
    const { student, inviteCode } = await createStudent({ name: "E", email });
    await redeemInvite(inviteCode);
    await setUserPassword(student.id, "correct horse battery");
    await database.sessions.create({
      userId: student.id,
      tokenHash: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await redeemInvite(await issueInvite(student.id));
    const after = await database.users.findById(student.id);
    expect(after?.passwordHash).toBeNull();
    expect(await database.sessions.countForUser(student.id)).toBe(0);
  });

  it("refuses an expired code", async () => {
    const { student } = await createStudent({
      name: "F",
      email: unique("exp"),
    });
    const code = await issueInvite(student.id, new Date(Date.now() - 1000));
    await expect(redeemInvite(code)).rejects.toThrow(/invalid or expired/);
  });
});

describe.skipIf(!enabled)("students", () => {
  it("refuses a duplicate email, case-insensitively", async () => {
    const email = unique("dupe");
    await createStudent({ name: "G", email });
    await expect(
      createStudent({ name: "G2", email: email.toUpperCase() }),
    ).rejects.toThrow(/already exists/);
  });

  it("deleting a student erases their submissions and progress", async () => {
    const { student } = await createStudent({
      name: "H",
      email: unique("del"),
    });
    const version = await currentVersionOf("f1-001");
    await submitAnswer(student.id, version.id, "1");
    expect(await database.submissions.listForStudent(student.id)).toHaveLength(
      1,
    );
    await deleteStudent(student.id);
    expect(await database.submissions.listForStudent(student.id)).toHaveLength(
      0,
    );
    expect(await database.progress.listForStudent(student.id)).toHaveLength(0);
  });

  it("never deletes an admin", async () => {
    const admin = await database.users.findFirstWithRole("ADMIN");
    expect(await deleteStudent(admin!.id)).toBeNull();
    expect(await database.users.findById(admin!.id)).not.toBeNull();
  });
});

describe.skipIf(!enabled)("publishing a new version", () => {
  it("does not re-lock the next challenge for someone who already solved v1", async () => {
    const { student } = await createStudent({
      name: "I",
      email: unique("v2"),
    });
    const { first, v1, next } = await makeChallengePair(
      "cars",
      new Date("2020-06-01T00:00:00Z"),
    );
    await database.progress.recordAttempt({
      studentId: student.id,
      challengeId: first.id,
      challengeVersionId: v1.id,
      now: new Date(),
      solved: true,
    });
    expect((await getChallengeStatus(database, student.id, next.id)).kind).toBe(
      "AVAILABLE",
    );
    const batch = await getChallengeStatuses(database, student.id, [next.id]);
    expect(batch.get(next.id)?.kind).toBe("AVAILABLE");
  });

  it("keeps showing v1 while v2 is scheduled for the future", async () => {
    const { first, v1 } = await makeChallengePair(
      "cars",
      new Date(Date.now() + 86400000 * 30),
    );
    const versions = await database.challenges.listVersions(first.id);
    expect(currentVersion(versions)?.id).toBe(v1.id);
  });

  it("tells a stale page to reload instead of recording an answer", async () => {
    const { student } = await createStudent({
      name: "J",
      email: unique("stale"),
    });
    const { v1 } = await makeChallengePair(
      "cars",
      new Date("2020-06-01T00:00:00Z"),
    );
    const result = await submitAnswer(student.id, v1.id, "1");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Reload the page/);
    expect(await database.submissions.listForStudent(student.id)).toHaveLength(
      0,
    );
  });
});

describe("bcrypt sanity", () => {
  it("is the library the dummy-hash timing guard relies on", async () => {
    expect(await bcrypt.compare("x", bcrypt.hashSync("x", 4))).toBe(true);
  });
});
