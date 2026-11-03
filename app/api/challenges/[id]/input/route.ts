import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { findChallenge } from "@/lib/challenges/loader";
import { currentVersion } from "@/lib/challenges/versions";
import { database } from "@/lib/container";
import { getChallengeStatus } from "@/lib/progress";
import { challengeRng } from "@/lib/rng";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized\n", { status: 401 });

  const { id } = await params;
  const row = await database.challenges.findBySlug(id);
  const version = row && currentVersion(row.versions);
  if (!row || !version)
    return new Response("Challenge not found\n", { status: 404 });

  const status = await getChallengeStatus(database, user.id, version.id);
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
