import { NextResponse } from "next/server";

import { database } from "@/lib/container";

// Never cache: a health check that answers from a cache is not a check.
export const dynamic = "force-dynamic";

/** Liveness plus a database round trip. Used by Docker and uptime monitors. */
export async function GET() {
  try {
    await database.ping();
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
