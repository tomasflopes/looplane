"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { createInviteCode, hashInviteCode } from "@/lib/invites";

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

  const existing = await db.user.findUnique({ where: { email } });
  if (existing)
    return {
      ok: false,
      message: `${email} already exists. Issue a new invite code instead.`,
    };

  const inviteCode = createInviteCode();
  const student = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        role: "STUDENT",
        inviteCodes: {
          create: { codeHash: hashInviteCode(inviteCode) },
        },
      },
    });
    if (classId) {
      const target = await tx.class.findUnique({ where: { id: classId } });
      if (target)
        await tx.classMembership.create({
          data: { classId: target.id, studentId: created.id },
        });
    }
    return created;
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
  const student = await db.user.findUnique({ where: { id: studentId } });
  if (!student) return { ok: false, message: "That student no longer exists." };

  const inviteCode = createInviteCode();
  await db.inviteCode.create({
    data: { codeHash: hashInviteCode(inviteCode), studentId },
  });
  revalidatePath("/admin/students");
  return {
    ok: true,
    message: `New invite code for ${student.name}.`,
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
  const existing = await db.class.findUnique({ where: { name: name.data } });
  if (existing)
    return {
      ok: false,
      message: `A class called "${name.data}" already exists.`,
    };
  await db.class.create({ data: { name: name.data } });
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
    db.class.findUnique({ where: { id: classId } }),
    db.user.findUnique({ where: { id: studentId } }),
  ]);
  if (!target || !student)
    return { ok: false, message: "That class or student no longer exists." };
  await db.classMembership.upsert({
    where: { classId_studentId: { classId, studentId } },
    create: { classId, studentId },
    update: {},
  });
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
  await db.classMembership.deleteMany({ where: { classId, studentId } });
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
  await db.class.delete({ where: { id: classId } });
  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/admin/submissions");
  redirect("/admin/classes");
}
