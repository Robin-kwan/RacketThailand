import type { ReactNode } from "react";
import Link from "next/link";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";

type Translate = (key: string) => string;

export type AdminPortalNavItem = {
  path: string;
  href: string;
  label: string;
};

export type AdminPortalShellCopy = {
  navigationLabel: string;
};

type AdminPortalShellProps = {
  activePath: string;
  title: string;
  navItems: AdminPortalNavItem[];
  copy: AdminPortalShellCopy;
  children: ReactNode;
};

export function buildAdminPortalNav(locale: Locale, t: Translate) {
  return [
    {
      path: "/admin",
      href: buildLocalizedPath("/admin", locale),
      label: t("admin.dashboardNavTitle"),
    },
    {
      path: "/admin/courts",
      href: buildLocalizedPath("/admin/courts", locale),
      label: t("admin.panelFeatures.courts.title"),
    },
    {
      path: "/admin/groups",
      href: buildLocalizedPath("/admin/groups", locale),
      label: t("admin.panelFeatures.groups.title"),
    },
    {
      path: "/admin/group-imports",
      href: buildLocalizedPath("/admin/group-imports", locale),
      label: "Group imports",
    },
    {
      path: "/admin/casual-plays",
      href: buildLocalizedPath("/admin/casual-plays", locale),
      label: t("admin.panelFeatures.casualPlays.title"),
    },
    {
      path: "/admin/court-owners",
      href: buildLocalizedPath("/admin/court-owners", locale),
      label: t("admin.panelFeatures.courtOwners.title"),
    },
    {
      path: "/admin/feedback",
      href: buildLocalizedPath("/admin/feedback", locale),
      label: t("admin.panelFeatures.feedback.title"),
    },
  ] satisfies AdminPortalNavItem[];
}

export function AdminPortalShell({
  activePath,
  title,
  navItems,
  copy,
  children,
}: AdminPortalShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-[2400px] flex-col gap-6 px-6 pb-20 pt-10 md:px-10 xl:flex-row xl:items-start">
        <aside className="xl:sticky xl:top-10 xl:w-[260px] xl:flex-none">
          <nav
            aria-label={copy.navigationLabel}
            className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = item.path === activePath;
                return (
                  <Link
                    key={item.path}
                    href={item.href}
                    className={`block rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white px-8 py-7 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          </section>
          {children}
        </div>
      </main>
    </div>
  );
}
