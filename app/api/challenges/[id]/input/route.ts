import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { findChallenge } from "@/lib/challenges/loader";
import { db } from "@/lib/db";
import { getChallengeStatus } from "@/lib/progress";
import { challengeRng } from "@/lib/rng";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized\n", { status: 401 });

  const { id } = await params;
  const row = await db.challenge.findUnique({
    where: { slug: id },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  const version = row?.versions[0];
  if (!row || !version)
    return new Response("Challenge not found\n", { status: 404 });

  const status = await getChallengeStatus(db, user.id, version.id);
  if (status.kind !== "AVAILABLE" && status.kind !== "SOLVED") {
    return new Response("Challenge is not available\n", { status: 403 });
  }

  const definition = await findChallenge(row.slug);
  const input = definition.generate(
    challengeRng(user.id, row.slug, version.version),
  );
  return new NextResponse(`${input.display}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
