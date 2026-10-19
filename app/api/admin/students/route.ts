import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createInviteCode, hashInviteCode } from "@/lib/invites";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(254),
  expiresAt: z.string().datetime().optional(),
});
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const input = schema.parse(await request.json());
    const inviteCode = createInviteCode();
    const student = await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: input.email },
      });
      if (existing) throw new Error("A user with this email already exists.");
      return tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          role: "STUDENT",
          inviteCodes: {
            create: {
              codeHash: hashInviteCode(inviteCode),
              expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            },
          },
        },
      });
    });
    return NextResponse.json(
      {
        student: { id: student.id, name: student.name, email: student.email },
        inviteCode,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
