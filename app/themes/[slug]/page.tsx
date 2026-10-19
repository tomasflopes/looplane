import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getChallengeStatuses } from "@/lib/progress";

export default async function ThemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const theme = await db.theme.findUnique({
    where: { slug: (await params).slug },
    include: {
      challenges: {
        orderBy: { sequence: "asc" },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      },
    },
  });
  if (!theme) notFound();

  const versionIds = theme.challenges
    .map((c) => c.versions[0]?.id)
    .filter((id): id is string => !!id);
  const statuses = await getChallengeStatuses(db, user.id, versionIds);
  const solved = versionIds.filter(
    (id) => statuses.get(id)?.kind === "SOLVED",
  ).length;

  return (
    <>
      <p className="eyebrow">Theme</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {theme.name}
        </h1>
        <p className="font-mono text-sm text-slate-500">
          {solved} / {theme.challenges.length} solved
        </p>
      </div>
      <p className="mt-2 max-w-2xl text-slate-600">{theme.description}</p>

      <div className="mt-4 h-1.5 max-w-2xl overflow-hidden rounded-full bg-slate-200/70">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{
            width: `${
              theme.challenges.length
                ? (solved / theme.challenges.length) * 100
                : 0
            }%`,
          }}
        />
      </div>

      {theme.challenges.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p className="font-medium text-slate-700">Nothing here yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Challenges for this theme have not been published yet.
          </p>
        </div>
      ) : (
        <ol className="mt-8 space-y-3">
          {theme.challenges.map((c) => {
            const v = c.versions[0];
            if (!v) return null;
            const status = statuses.get(v.id);
            const locked =
              status?.kind !== "AVAILABLE" && status?.kind !== "SOLVED";
            return (
              <li key={c.id}>
                <Link
                  href={locked ? "#" : `/challenges/${c.slug}`}
                  aria-disabled={locked}
                  className={`card flex items-center gap-4 p-4 no-underline transition ${
                    locked
                      ? "cursor-not-allowed opacity-70"
                      : "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-sm font-semibold text-slate-500">
                    {c.sequence.toString().padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {v.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {v.subtitle}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
