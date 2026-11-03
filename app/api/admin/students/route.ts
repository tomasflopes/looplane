import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { createStudent, StudentExistsError } from "@/lib/students";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  expiresAt: z.string().datetime().optional(),
});
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const { student, inviteCode } = await createStudent({
      ...parsed.data,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    });
    return NextResponse.json(
      {
        student: { id: student.id, name: student.name, email: student.email },
        inviteCode,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof StudentExistsError)
      return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("POST /api/admin/students failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
