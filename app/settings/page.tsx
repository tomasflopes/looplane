import { updateInterests } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Settings() {
  const user = await requireUser();
  const themes = await db.theme.findMany({ orderBy: { name: "asc" } });
  const selected = new Set(
    (await db.studentInterest.findMany({ where: { studentId: user.id } })).map(
      (i) => i.themeId,
    ),
  );
  return (
    <>
      <p className="eyebrow">Settings</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Settings
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Tell us what you are interested in and we will surface those themes
        first. Preferences never limit what you can open.
      </p>

      <form action={updateInterests} className="mt-8 max-w-2xl">
        <fieldset>
          <legend className="text-xl font-semibold">Your interests</legend>
          <div className="mt-4 space-y-3">
            {themes.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition has-checked:border-brand-300 has-checked:bg-brand-50/40"
              >
                <input
                  type="checkbox"
                  name="themes"
                  value={t.id}
                  defaultChecked={selected.has(t.id)}
                  className="mt-0.5 h-4 w-4 accent-brand-600"
                />
                <span>
                  <span className="font-medium text-slate-900">{t.name}</span>
                  <span className="mt-0.5 block text-sm text-slate-600">
                    {t.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <button className="btn-primary mt-5">Save interests</button>
      </form>
    </>
  );
}
