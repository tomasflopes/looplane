import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 text-slate-600">
        That page does not exist, or it is not open to you yet.
      </p>
      <Link href="/dashboard" className="btn-primary mt-6">
        Back to the dashboard
      </Link>
    </section>
  );
}
