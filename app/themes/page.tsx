import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getChallengeStatuses } from "@/lib/progress";

export default async function Themes() {
  const user = await requireUser();
  const themes = await db.theme.findMany({
    include: {
      challenges: {
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      },
    },
    orderBy: { name: "asc" },
  });
  const versionIds = themes.flatMap((t) =>
    t.challenges
      .map((c) => c.versions[0]?.id)
      .filter((id): id is string => !!id),
  );
  const statuses = await getChallengeStatuses(db, user.id, versionIds);

  return (
    <>
      <p className="eyebrow">Themes</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Pick a theme
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Each theme is a short path through a set of problems. Solve them in
        order to unlock the next one.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {themes.map((t) => {
          const ids = t.challenges
            .map((c) => c.versions[0]?.id)
            .filter((id): id is string => !!id);
          const solved = ids.filter(
            (id) => statuses.get(id)?.kind === "SOLVED",
          ).length;
          return (
            <Link
              key={t.id}
              className="card group p-5 no-underline transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              href={`/themes/${t.slug}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-semibold text-slate-900">{t.name}</h2>
                <span className="font-mono text-xs text-slate-500">
                  {solved}/{t.challenges.length}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">{t.description}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{
                    width: `${
                      t.challenges.length
                        ? (solved / t.challenges.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
