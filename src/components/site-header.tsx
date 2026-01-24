"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SPORT_META } from "@/data/sportMeta";
import enMessages from "@/messages/en.json";
import thMessages from "@/messages/th.json";
import {
  buildLocalizedPath,
  DEFAULT_LOCALE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n";
import { useHeaderConfig } from "@/components/header-context";
import { NotificationsMenu } from "@/components/notifications-menu";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type HeaderUser = {
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
};

type SiteHeaderProps = {
  user?: HeaderUser | null;
  isAdmin?: boolean;
};

const UI_STRINGS = {
  th: { header: thMessages.header, notifications: thMessages.notifications },
  en: { header: enMessages.header, notifications: enMessages.notifications },
};

const LOCALE_INFO: Record<
  Locale,
  { label: string; flag: string; icon: string }
> = {
  th: { label: "ไทย", flag: "🇹🇭", icon: "/flags/th.svg" },
  en: { label: "English", flag: "🇺🇸", icon: "/flags/us.svg" },
};

type HeaderNavLink = {
  label: string;
  path: string;
  href: string;
};

function deriveSportLabel(pathname: string, locale: Locale) {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return undefined;
  const sportSlug = segments[0];
  const sportMeta = SPORT_META[sportSlug];
  if (sportMeta) {
    return sportMeta.name[locale];
  }
  return undefined;
}

export function SiteHeader({
  user,
  isAdmin = false,
}: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { subLabel: customSubLabel, sportSlug: overrideSportSlug } =
    useHeaderConfig();
  const locale = normalizeLocale(searchParams?.get("lang"));
  const strings = UI_STRINGS[locale];
  const labels = strings.header;
  const notificationCopy = strings.notifications;
  const segments = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname],
  );
  const derivedSportSlug = segments[0];
  const activeSportSlug = overrideSportSlug ?? derivedSportSlug;
  const activeSport = activeSportSlug ? SPORT_META[activeSportSlug] : undefined;
  const accent = "#0f172a";
  const accentGlowStyle = useMemo(
    () => ({
      boxShadow: `0 25px 60px ${accent}24`,
    }),
    [accent],
  );
  const accentStripeStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(120deg, ${accent}, #0f172a)`,
    }),
    [accent],
  );
  const navLinks = useMemo<HeaderNavLink[]>(() => {
    if (!activeSport || !activeSportSlug) return [];
    const basePath = `/${activeSportSlug}`;
    const definitions = [
      {
        label: labels.sportHome ?? labels.brand,
        path: basePath,
      },
      {
        label: labels.courtFinder ?? "Court finder",
        path: `${basePath}/court-finder`,
      },
      {
        label: labels.groupFinder ?? "Group finder",
        path: `${basePath}/group-finder`,
      },
    ];
    return definitions.map((definition) => ({
      ...definition,
      href: buildLocalizedPath(definition.path, locale),
    }));
  }, [
    activeSport,
    activeSportSlug,
    labels.sportHome,
    labels.brand,
    labels.courtFinder,
    labels.groupFinder,
    locale,
  ]);
  const autoSubLabel = useMemo(
    () => activeSport?.name[locale] ?? deriveSportLabel(pathname, locale),
    [activeSport, pathname, locale],
  );
  const resolvedSubLabel =
    customSubLabel ?? autoSubLabel ?? "racketthailand.com";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const localeMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const closeMobileNav = () => setMobileNavOpen(false);

  const handleLocaleSelect = (targetLocale: Locale) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (targetLocale === DEFAULT_LOCALE) {
      params.delete("lang");
    } else {
      params.set("lang", targetLocale);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, {
      scroll: false,
    });
    setLocaleMenuOpen(false);
    closeMobileNav();
  };
  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace(buildLocalizedPath("/", locale));
    router.refresh();
  };
  const initials =
    (user?.fullName?.charAt(0) ||
      user?.email?.charAt(0) ||
      labels.brand.charAt(0) ||
      "R").toUpperCase();
  const isAuthenticated = Boolean(user);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
      if (
        localeMenuRef.current &&
        event.target instanceof Node &&
        !localeMenuRef.current.contains(event.target)
      ) {
        setLocaleMenuOpen(false);
      }
      if (
        mobileMenuRef.current &&
        event.target instanceof Node &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);
  const headerClass =
    "relative w-full bg-[var(--rt-primary)] py-3 px-4 text-sm text-[var(--rt-primary-text)] transition-all duration-300 md:px-8";

  return (
    <>
      <header
        className={headerClass}
        style={accentGlowStyle}
      >
      <span
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(circle at 15% -10%, ${accent}20, transparent 50%)`,
        }}
      />
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-90"
        style={accentStripeStyle}
      />
      <div className="relative z-20 mx-auto flex w-full max-w-screen-xl flex-col gap-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full items-center justify-between gap-4 md:w-auto md:gap-6">
            <Link
              href={buildLocalizedPath("/", locale)}
              className="flex items-center gap-4"
            >
              <div className="text-left">
                <p className="text-lg font-semibold text-white">
                  {labels.brand}
                </p>
                <p className="text-[11px] font-semibold uppercase text-[rgb(var(--rt-primary-text-rgb)/0.75)]">
                  <span style={{ color: "#cbf7d1" }}>
                    {resolvedSubLabel}
                  </span>
                </p>
              </div>
            </Link>
            {navLinks.length > 0 && (
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20 md:hidden"
                aria-label="Open navigation menu"
              >
                ☰
              </button>
            )}
          </div>
          {navLinks.length > 0 && (
            <nav className="hidden flex-wrap items-center gap-6 text-sm font-semibold text-white md:flex">
              {navLinks.map((link) => {
                const isLinkActive =
                  pathname === link.path ||
                  (link.path !== "/" && pathname.startsWith(`${link.path}/`));
                return (
                  <Link
                    key={link.path}
                    href={link.href}
                    aria-current={isLinkActive ? "page" : undefined}
                    className={`transition ${
                      isLinkActive ? "text-slate-200" : "text-white hover:text-slate-200"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
            {isAuthenticated && (
              <NotificationsMenu locale={locale} copy={notificationCopy} />
            )}
            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full border border-[rgb(var(--foreground-rgb)/0.15)] bg-white px-2 py-1 text-left text-sm font-semibold text-[var(--foreground)] hover:border-[rgb(var(--foreground-rgb)/0.4)]"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[var(--rt-primary-soft)] text-white">
                    {user?.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={user.fullName ?? user.email}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-base font-semibold">
                        {initials}
                      </span>
                    )}
                  </div>
                  <div className="hidden text-left text-xs sm:block">
                    <p className="text-sm font-semibold">
                      {user?.fullName ?? user?.email}
                    </p>
                    <p className="text-emerald-600">{user?.email}</p>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`transition ${menuOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-3 w-58 rounded-2xl border border-[rgb(var(--foreground-rgb)/0.15)] bg-white p-3 text-sm text-[var(--foreground)]"
                    role="menu"
                  >
                    <div className="flex flex-col">
                      <Link
                        href={buildLocalizedPath("/profile/edit", locale)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-[var(--foreground)] hover:bg-[rgb(var(--foreground-rgb)/0.1)]"
                        onClick={() => setMenuOpen(false)}
                      >
                        {labels.profile}
                        <span aria-hidden>↗</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          href={buildLocalizedPath("/admin", locale)}
                          className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-[var(--foreground)] hover:bg-[rgb(var(--foreground-rgb)/0.1)]"
                          onClick={() => setMenuOpen(false)}
                        >
                          {labels.admin}
                          <span aria-hidden>↗</span>
                        </Link>
                      )}
                      <Link
                        href={buildLocalizedPath("/dashboard", locale)}
                        className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-[var(--foreground)] hover:bg-[rgb(var(--foreground-rgb)/0.1)]"
                        onClick={() => setMenuOpen(false)}
                      >
                        {labels.dashboard}
                        <span aria-hidden>↗</span>
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-[var(--foreground)] hover:bg-[rgb(var(--foreground-rgb)/0.1)]"
                      role="menuitem"
                    >
                      {labels.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href={buildLocalizedPath("/login", locale)}
                  className="rounded-full border border-slate-200/70 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-slate-400"
                >
                  {labels.login}
                </Link>
              </div>
            )}
            <div className="relative hidden md:block" ref={localeMenuRef}>
              <button
                type="button"
                onClick={() => setLocaleMenuOpen((prev) => !prev)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgb(var(--foreground-rgb)/0.15)] bg-white text-xl text-[var(--foreground)] hover:border-[rgb(var(--foreground-rgb)/0.4)]"
                aria-label={LOCALE_INFO[locale].label}
              >
                <Image
                  src={LOCALE_INFO[locale].icon}
                  alt={`${LOCALE_INFO[locale].label} flag`}
                  width={20}
                  height={14}
                  className="h-4 w-6 rounded-sm object-cover"
                />
              </button>
              {localeMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-[rgb(var(--foreground-rgb)/0.15)] bg-white p-2 text-sm text-[var(--foreground)]">
                  {(Object.keys(LOCALE_INFO) as Locale[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleLocaleSelect(option)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left ${
                        option === locale
                          ? "bg-[rgb(var(--foreground-rgb)/0.08)] font-semibold"
                          : "text-[rgb(var(--foreground-rgb)/0.7)] hover:bg-[rgb(var(--foreground-rgb)/0.05)]"
                      }`}
                    >
                      <Image
                        src={LOCALE_INFO[option].icon}
                        alt={`${LOCALE_INFO[option].label} flag`}
                        width={18}
                        height={12}
                        className="h-3 w-5 rounded-[2px] object-cover"
                      />
                      <span>{LOCALE_INFO[option].label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </header>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[999] flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close menu overlay"
            onClick={closeMobileNav}
          />
          <aside
            ref={mobileMenuRef}
            className="relative ml-auto flex h-full w-80 flex-col gap-6 border-l border-slate-800 bg-[var(--rt-primary-soft)] p-6 text-slate-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-300">
                  {labels.brand}
                </p>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {resolvedSubLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMobileNav}
                className="rounded-full border border-slate-700 p-3 text-slate-200 hover:border-slate-500"
                aria-label="Close menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m6 6 12 12M6 18 18 6"
                  />
                </svg>
              </button>
            </div>
            {navLinks.length > 0 && (
            <nav className="space-y-3">
                {navLinks.map((link) => {
                  const isLinkActive =
                    pathname === link.path ||
                    (link.path !== "/" && pathname.startsWith(`${link.path}/`));
                  return (
                    <Link
                      key={link.path}
                      href={link.href}
                      onClick={closeMobileNav}
                      className={`flex items-center justify-between text-base font-semibold ${
                        isLinkActive
                          ? "text-slate-200"
                          : "text-white hover:text-slate-200"
                      }`}
                    >
                      {link.label}
                      {isLinkActive && <span aria-hidden>•</span>}
                    </Link>
                  );
                })}
              </nav>
            )}
            <div className="space-y-5">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-800 text-white">
                      {user?.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.fullName ?? user.email}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-lg font-semibold">
                          {user?.fullName?.[0]?.toUpperCase() ??
                            user?.email?.[0]?.toUpperCase() ??
                            "R"}
                        </span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">
                        {user?.fullName ?? user?.email}
                      </p>
                      <p className="text-xs text-slate-400">{user?.email}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-200">
                        {notificationCopy.title}
                      </p>
                      <NotificationsMenu
                        locale={locale}
                        copy={notificationCopy}
                      />
                    </div>
                  </div>
                  <Link
                    href={buildLocalizedPath("/profile/edit", locale)}
                    className="block rounded-xl border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
                    onClick={closeMobileNav}
                  >
                    {labels.profile}
                  </Link>
                  <Link
                    href={buildLocalizedPath("/dashboard", locale)}
                    className="block rounded-xl border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
                    onClick={closeMobileNav}
                  >
                    {labels.dashboard}
                  </Link>
                  {isAdmin && (
                    <Link
                      href={buildLocalizedPath("/admin", locale)}
                      className="block rounded-xl border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
                      onClick={closeMobileNav}
                    >
                      {labels.admin}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileNav();
                      void handleLogout();
                    }}
                    className="w-full rounded-xl border border-slate-800 px-4 py-3 text-left text-sm font-semibold text-rose-300"
                  >
                    {labels.logout}
                  </button>
                </>
              ) : (
                <Link
                  href={buildLocalizedPath("/login", locale)}
                  className="block rounded-xl border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-100"
                  onClick={closeMobileNav}
                >
                  {labels.login}
                </Link>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                {labels.language}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(Object.keys(LOCALE_INFO) as Locale[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleLocaleSelect(option)}
                    className={`flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold ${
                      option === locale
                        ? "border-slate-600 text-white"
                        : "border-slate-800 text-slate-300"
                    }`}
                  >
                    {LOCALE_INFO[option].label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
