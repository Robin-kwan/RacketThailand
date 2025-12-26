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
  const accent = activeSport?.accent ?? "#0f172a";
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const localeMenuRef = useRef<HTMLDivElement | null>(null);

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
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  const headerClass =
    "relative w-full bg-white/90 py-6 px-4 text-sm text-slate-900 shadow-lg shadow-slate-900/5 backdrop-blur transition-all duration-300 md:px-8";

  return (
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
      <div className="relative z-10 flex w-full flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <Link
              href={buildLocalizedPath("/", locale)}
              className="flex items-center gap-4"
            >
              <div
                className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white p-1 shadow-inner"
                style={{
                  boxShadow: `0 18px 40px ${accent}33`,
                }}
              >
                <span
                  className="absolute inset-0 rounded-2xl opacity-70"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, rgba(15,23,42,0.5))`,
                  }}
                />
                <Image
                  src="/logo.svg"
                  alt="RacketThailand logo"
                  width={44}
                  height={44}
                  priority
                  className="relative z-10"
                />
              </div>
              <div className="text-left">
                <p className="text-lg font-semibold tracking-wide text-slate-900">
                  {labels.brand}
                </p>
                <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">
                  <span style={{ color: accent }}>{resolvedSubLabel}</span>
                </p>
              </div>
            </Link>
            {navLinks.length > 0 && (
              <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                {navLinks.map((link) => {
                  const isLinkActive =
                    pathname === link.path ||
                    (link.path !== "/" && pathname.startsWith(`${link.path}/`));
                  return (
                    <Link
                      key={link.path}
                      href={link.href}
                      aria-current={isLinkActive ? "page" : undefined}
                      className={`rounded-full px-4 py-2 transition ${
                        isLinkActive
                          ? "text-white"
                          : "border border-transparent hover:border-slate-200 hover:text-slate-900"
                      }`}
                      style={
                        isLinkActive
                          ? {
                              backgroundColor: accent,
                              boxShadow: `0 12px 25px ${accent}44`,
                            }
                          : undefined
                      }
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isAuthenticated && (
              <NotificationsMenu locale={locale} copy={notificationCopy} />
            )}
            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-3 rounded-full border border-slate-200/70 bg-white/90 px-3 py-2 text-left text-sm font-semibold text-slate-900 shadow-sm hover:border-slate-400"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-900 text-white">
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
                    <p className="text-slate-500">{user?.email}</p>
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
                    className="absolute right-0 top-full z-50 mt-3 w-60 rounded-2xl border border-slate-200/80 bg-white/95 p-3 text-sm shadow-2xl shadow-slate-900/10 backdrop-blur"
                    role="menu"
                  >
                    <div className="flex flex-col">
                      <Link
                        href={buildLocalizedPath("/profile/edit", locale)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        {labels.profile}
                        <span aria-hidden>↗</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          href={buildLocalizedPath("/admin", locale)}
                          className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          {labels.admin}
                          <span aria-hidden>↗</span>
                        </Link>
                      )}
                      <Link
                        href={buildLocalizedPath("/dashboard", locale)}
                        className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        {labels.dashboard}
                        <span aria-hidden>↗</span>
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                    >
                      {labels.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={buildLocalizedPath("/login", locale)}
                  className="rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 font-semibold text-slate-700 shadow-sm hover:border-slate-400"
                >
                  {labels.login}
                </Link>
                <Link
                  href={buildLocalizedPath("/signup", locale)}
                  className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white shadow-sm shadow-slate-900/30 hover:bg-slate-800"
                >
                  {labels.signup}
                </Link>
              </div>
            )}
            <div className="relative" ref={localeMenuRef}>
              <button
                type="button"
                onClick={() => setLocaleMenuOpen((prev) => !prev)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-xl shadow-sm hover:border-slate-400"
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
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-slate-200/80 bg-white/95 p-2 text-sm shadow-xl shadow-slate-900/10 backdrop-blur">
                  {(Object.keys(LOCALE_INFO) as Locale[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleLocaleSelect(option)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-50 ${
                        option === locale
                          ? "font-semibold text-slate-900"
                          : "text-slate-600"
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
  );
}
