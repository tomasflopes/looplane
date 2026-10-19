import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/copy-button";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { SubmissionForm } from "@/components/submission-form";
import { requireUser } from "@/lib/auth";
import { findChallenge } from "@/lib/challenges/loader";
import { db } from "@/lib/db";
import { getChallengeStatus } from "@/lib/progress";
import { challengeRng } from "@/lib/rng";

const difficultyStyles: Record<string, string> = {
  beginner: "bg-emerald-50 text-emerald-700",
  intermediate: "bg-amber-50 text-amber-700",
  advanced: "bg-rose-50 text-rose-700",
};

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(),
    id = (await params).id;
  const row = await db.challenge.findUnique({
    where: { slug: id },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      theme: true,
    },
  });
  const version = row?.versions[0];
  if (!row || !version) notFound();
  const status = await getChallengeStatus(db, user.id, version.id);
  if (status.kind !== "AVAILABLE" && status.kind !== "SOLVED")
    return (
      <section className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{version.title}</h1>
        <div className="card mt-6 p-6 text-left">
          <p className="font-medium text-slate-800">
            {status.kind === "LOCKED_NOT_PUBLISHED"
              ? `This challenge opens on ${status.publishedAt.toLocaleString()}.`
              : "This challenge is locked."}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {status.kind === "LOCKED_NOT_PUBLISHED"
              ? "Come back then, or keep working through the challenges that are already open."
              : "Solve the previous challenge in this theme to unlock it."}
          </p>
          <Link
            className="btn-secondary mt-5"
            href={`/themes/${row.theme.slug}`}
          >
            Back to {row.theme.name}
          </Link>
        </div>
      </section>
    );

  const definition = await findChallenge(row.slug),
    input = definition.generate(
      challengeRng(user.id, row.slug, version.version),
    );
  const progress = await db.challengeProgress.findUnique({
    where: {
      studentId_challengeVersionId: {
        studentId: user.id,
        challengeVersionId: version.id,
      },
    },
  });

  return (
    <>
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/themes" className="hover:text-slate-800">
          Themes
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/themes/${row.theme.slug}`}
          className="hover:text-slate-800"
        >
          {row.theme.name}
        </Link>
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`badge ${
            difficultyStyles[version.difficulty] ?? difficultyStyles.beginner
          }`}
        >
          {version.difficulty}
        </span>
        <span className="font-mono text-xs text-slate-400">
          {row.theme.name} · challenge{" "}
          {row.sequence.toString().padStart(2, "0")}
        </span>
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {version.title}
      </h1>
      <p className="mt-1.5 text-lg text-slate-600">{version.subtitle}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        <section className="card p-6">
          <h2 className="mb-4 text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
            The problem
          </h2>
          <Markdown>{definition.problem}</Markdown>
        </section>

        <div className="space-y-4 lg:sticky lg:top-20">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
                Your input
              </h2>
              <CopyButton value={input.display} variant="light" />
            </div>
            <pre className="overflow-x-auto bg-slate-900 p-5 font-mono text-sm leading-relaxed text-slate-50">
              {input.display}
            </pre>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
              <p className="text-xs text-slate-500">
                Output type:{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
                  {definition.metadata.output.type}
                </code>
              </p>
              <a
                className="text-xs font-medium text-brand-700 hover:text-brand-900"
                href={`/api/challenges/${row.slug}/input`}
                target="_blank"
                rel="noreferrer"
              >
                Open as plain text
              </a>
            </div>
          </section>

          {status.kind === "SOLVED" ? (
            <section className="card border-emerald-200 bg-emerald-50/60 p-6">
              <p className="flex items-center gap-2 font-semibold text-emerald-800">
                <CheckIcon className="h-5 w-5" />
                Solved
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                Finished on {status.solvedAt.toLocaleString()}
              </p>
              <div className="mt-5 border-t border-emerald-200 pt-5">
                <h2 className="text-lg font-bold">Solution</h2>
                <div className="mt-3">
                  <Markdown>{definition.solution}</Markdown>
                </div>
              </div>
            </section>
          ) : (
            <section className="card p-6">
              <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
                Submit your answer
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Write only the output your program would print.
              </p>
              <div className="mt-4">
                <SubmissionForm
                  challengeId={row.slug}
                  challengeVersionId={version.id}
                  attempts={progress?.attempts ?? 0}
                />
              </div>
            </section>
          )}

          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
            href={`/themes/${row.theme.slug}`}
          >
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
            Back to {row.theme.name}
          </Link>
        </div>
      </div>
    </>
  );
}
