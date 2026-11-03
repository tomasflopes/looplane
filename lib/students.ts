import { database } from "@/lib/container";
import { createInviteCode, hashInviteCode } from "@/lib/invites";
import { normalizeEmail } from "@/lib/password";
import { UniqueViolationError } from "@/lib/ports";

/**
 * The one place students are created and invited. The admin screen, the admin
 * API and the CLI all go through here, so they cannot drift apart. No
 * `server-only` import: the CLI uses this module too.
 */
export class StudentExistsError extends Error {}

type NewStudent = {
  name: string;
  email: string;
  classId?: string;
  expiresAt?: Date | null;
};

export async function createStudent(input: NewStudent) {
  const email = normalizeEmail(input.email);
  const inviteCode = createInviteCode();
  try {
    const student = await database.transaction(async (r) => {
      const created = await r.users.create({
        name: input.name.trim(),
        email,
        role: "STUDENT",
      });
      await r.invites.create({
        studentId: created.id,
        codeHash: hashInviteCode(inviteCode),
        expiresAt: input.expiresAt ?? null,
      });
      if (input.classId && (await r.classes.findById(input.classId)))
        await r.classes.addMember(input.classId, created.id);
      return created;
    });
    return { student, inviteCode };
  } catch (error) {
    // The unique index is the arbiter, so two simultaneous requests cannot
    // both create the same email.
    if (error instanceof UniqueViolationError)
      throw new StudentExistsError(`${email} already exists.`);
    throw error;
  }
}

/** A fresh code for an existing student. Redeeming it resets their password. */
export async function issueInvite(studentId: string, expiresAt?: Date | null) {
  const inviteCode = createInviteCode();
  await database.invites.create({
    studentId,
    codeHash: hashInviteCode(inviteCode),
    expiresAt: expiresAt ?? null,
  });
  return inviteCode;
}

/** CLI behaviour: create the student if needed, otherwise re-invite them. */
export async function inviteByEmail(input: NewStudent) {
  const email = normalizeEmail(input.email);
  const existing = await database.users.findByEmail(email);
  if (existing) {
    if (existing.role !== "STUDENT")
      throw new Error(`${email} is not a student account.`);
    return {
      inviteCode: await issueInvite(existing.id, input.expiresAt),
      existed: true,
    };
  }
  const { inviteCode } = await createStudent(input);
  return { inviteCode, existed: false };
}

/**
 * Erase a student and everything tied to them (submissions, progress,
 * sessions, invites, memberships). Admin accounts are refused.
 */
export async function deleteStudent(studentId: string) {
  const student = await database.users.findById(studentId);
  if (!student || student.role !== "STUDENT") return null;
  await database.users.delete(studentId);
  return student;
}
