"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-3 text-slate-600">
        The page could not be loaded. Your progress is safe. Try again, and if
        it keeps happening tell your teacher.
      </p>
      <button onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </section>
  );
}
