import Link from "next/link";

import { CheckIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ProgressPage() {
  const user = await requireUser();
  const themes = await db.theme.findMany({
    include: {
      challenges: {
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      },
    },
    orderBy: { name: "asc" },
  });
  const progress = await db.challengeProgress.findMany({
    where: { studentId: user.id },
  });
  const solved = progress.filter((p) => p.solvedAt);
  const solvedVersions = await db.challengeVersion.findMany({
    where: { id: { in: solved.map((p) => p.challengeVersionId) } },
    include: { challenge: { include: { theme: true } } },
  });

  return (
    <>
      <p className="eyebrow">Progress</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Your progress
      </h1>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Solved
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {solved.length}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Attempted
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {progress.length}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Themes started
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {new Set(solvedVersions.map((v) => v.challenge.themeId)).size}
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">By theme</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {themes.map((t) => {
            const ids = t.challenges.flatMap((c) =>
              c.versions.map((v) => v.id),
            );
            const count = solved.filter((p) =>
              ids.includes(p.challengeVersionId),
            ).length;
            const percent = t.challenges.length
              ? (count / t.challenges.length) * 100
              : 0;
            return (
              <Link
                key={t.id}
                href={`/themes/${t.slug}`}
                className="card block p-5 no-underline transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-slate-900">{t.name}</span>
                  <span className="font-mono text-xs text-slate-500">
                    {count} / {t.challenges.length}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {solvedVersions.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Solved</h2>
          <ul className="mt-3 space-y-2">
            {solvedVersions
              .sort(
                (a, b) =>
                  (b.publishedAt?.getTime() ?? 0) -
                  (a.publishedAt?.getTime() ?? 0),
              )
              .map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/challenges/${v.challenge.slug}`}
                    className="card flex items-center gap-3 p-4 no-underline transition hover:border-brand-300 hover:shadow-md"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">
                        {v.title}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {v.challenge.theme.name}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </>
  );
}
