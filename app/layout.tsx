import "./globals.css";
import Link from "next/link";

import { logoutAction } from "@/app/actions";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "Looplane",
  description: "Programming challenges for learners",
};

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/themes", label: "Themes" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
];

export default async function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-stone-50/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="group flex items-center gap-2.5 no-underline"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 font-mono text-sm font-bold text-white transition group-hover:bg-brand-700">
                ∿
              </span>
              <span className="font-mono text-base font-bold tracking-tight text-slate-900">
                looplane
              </span>
            </Link>
            {user ? (
              <div className="flex items-center gap-1 text-sm">
                <nav className="hidden items-center gap-1 sm:flex">
                  {navigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-lg px-3 py-1.5 font-medium text-slate-600 no-underline transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin/students"
                      className="rounded-lg px-3 py-1.5 font-medium text-brand-700 no-underline transition hover:bg-white hover:text-brand-900 hover:shadow-sm"
                    >
                      Admin
                    </Link>
                  )}
                </nav>
                <span className="mx-2 hidden h-5 w-px bg-slate-200 sm:block" />
                <span className="hidden max-w-32 truncate font-medium text-slate-700 sm:inline">
                  {user.name}
                </span>
                <form action={logoutAction}>
                  <button className="rounded-lg px-3 py-1.5 font-medium text-slate-500 transition hover:bg-white hover:text-slate-900">
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="btn-primary">
                Sign in
              </Link>
            )}
          </div>
          {user && (
            <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-5 pb-2 sm:hidden">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg bg-white/70 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-slate-600 no-underline shadow-sm transition hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin/students"
                  className="rounded-lg bg-white/70 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-brand-700 no-underline shadow-sm transition hover:text-brand-900"
                >
                  Admin
                </Link>
              )}
            </nav>
          )}
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-slate-200/80 py-6">
          <p className="mx-auto max-w-5xl px-5 text-xs text-slate-400">
            Looplane — learn to program by solving short challenges. Never
            compiles or runs your code.
          </p>
        </footer>
      </body>
    </html>
  );
}
