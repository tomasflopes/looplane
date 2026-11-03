"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { database } from "@/lib/container";
import {
  createStudent,
  deleteStudent,
  issueInvite,
  StudentExistsError,
} from "@/lib/students";

export type ActionResult = { ok: boolean; message: string };

const studentSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  classId: z.string().trim().optional(),
});

/**
 * Creates a student and their single-use invite code. The plaintext code is
 * returned once and never stored: only its SHA-256 hash reaches the database.
 */
export async function createStudentAction(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult & { inviteCode?: string; studentId?: string }> {
  await requireAdmin();
  const parsed = studentSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    classId: form.get("classId") || undefined,
  });
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the details.",
    };
  const { name, email, classId } = parsed.data;

  try {
    const { student, inviteCode } = await createStudent({
      name,
      email,
      classId,
    });
    revalidatePath("/admin/students");
    revalidatePath("/admin/classes");
    revalidatePath("/admin/submissions");
    return {
      ok: true,
      message: `${name} added. Give them this invite code.`,
      inviteCode,
      studentId: student.id,
    };
  } catch (error) {
    if (error instanceof StudentExistsError)
      return {
        ok: false,
        message: `${email} already exists. Issue a new invite code instead.`,
      };
    console.error("createStudentAction failed", error);
    return { ok: false, message: "Unable to add this student." };
  }
}

/**
 * Issues a replacement invite for a student whose code was used or lost.
 * The previous codes stay on file but stop working.
 */
export async function reissueInviteAction(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult & { inviteCode?: string }> {
  await requireAdmin();
  const studentId = z.string().min(1).parse(form.get("studentId"));
  const student = await database.users.findById(studentId);
  if (!student) return { ok: false, message: "That student no longer exists." };

  const inviteCode = await issueInvite(studentId);
  revalidatePath("/admin/students");
  return {
    ok: true,
    message: `New invite code for ${student.name}. Using it resets their password.`,
    inviteCode,
  };
}

export async function createClassAction(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const name = z
    .string()
    .trim()
    .min(1, "Give the class a name.")
    .max(80)
    .safeParse(form.get("name"));
  if (!name.success)
    return {
      ok: false,
      message: name.error.issues[0]?.message ?? "Check the name.",
    };
  const existing = await database.classes.findByName(name.data);
  if (existing)
    return {
      ok: false,
      message: `A class called "${name.data}" already exists.`,
    };
  await database.classes.create(name.data);
  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  return { ok: true, message: `Created ${name.data}.` };
}

export async function addStudentToClassAction(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const classId = z.string().min(1).parse(form.get("classId"));
  const studentId = z.string().min(1).parse(form.get("studentId"));
  const [target, student] = await Promise.all([
    database.classes.findById(classId),
    database.users.findById(studentId),
  ]);
  if (!target || !student)
    return { ok: false, message: "That class or student no longer exists." };
  await database.classes.addMember(classId, studentId);
  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/admin/submissions");
  return { ok: true, message: `${student.name} added to ${target.name}.` };
}

export async function removeStudentFromClassAction(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const classId = z.string().min(1).parse(form.get("classId"));
  const studentId = z.string().min(1).parse(form.get("studentId"));
  await database.classes.removeMember(classId, studentId);
  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/admin/submissions");
  return { ok: true, message: "Removed from class." };
}

export async function deleteClassAction(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const classId = z.string().min(1).parse(form.get("classId"));
  await database.classes.delete(classId);
  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/admin/submissions");
  redirect("/admin/classes");
}

export async function deleteStudentAction(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const studentId = z.string().min(1).parse(form.get("studentId"));
  const removed = await deleteStudent(studentId);
  if (!removed) return { ok: false, message: "That student no longer exists." };
  revalidatePath("/admin/students");
  revalidatePath("/admin/classes");
  revalidatePath("/admin/submissions");
  return {
    ok: true,
    message: `Deleted ${removed.name} and all of their data.`,
  };
}
