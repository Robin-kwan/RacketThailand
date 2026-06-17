"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ExternalLink, Menu } from "lucide-react";
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
import type { NotificationCopy } from "@/components/notifications-menu";
import { SiteHeaderMobileMenu } from "@/components/site-header-mobile-menu";
import { SportBallMark } from "@/components/sport-ball-mark";
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

type HeaderLabels = typeof enMessages.header;

const UI_STRINGS = {
  th: { header: thMessages.header, notifications: thMessages.notifications },
  en: { header: enMessages.header, notifications: enMessages.notifications },
} satisfies Record<
  Locale,
  {
    header: HeaderLabels;
    notifications: NotificationCopy;
  }
>;

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

function deriveSportSlugFromLabel(label: string | undefined, locale: Locale) {
  if (!label) return undefined;
  const normalizedLabel = label.trim().toLowerCase();
  if (!normalizedLabel) return undefined;
  return Object.entries(SPORT_META).find(([, sport]) => {
    const localizedName = sport.name[locale].trim().toLowerCase();
    const englishName = sport.name.en.trim().toLowerCase();
    return normalizedLabel === localizedName || normalizedLabel === englishName;
  })?.[0];
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
  const derivedSportSlug = SPORT_META[segments[0]] ? segments[0] : undefined;
  const labelSportSlug = deriveSportSlugFromLabel(customSubLabel, locale);
  const activeSportSlug = overrideSportSlug ?? derivedSportSlug;
  const resolvedSportSlug = activeSportSlug ?? labelSportSlug;
  const activeSport = resolvedSportSlug ? SPORT_META[resolvedSportSlug] : undefined;
  const navLinks = useMemo<HeaderNavLink[]>(() => {
    if (!activeSport || !resolvedSportSlug) return [];
    const basePath = `/${resolvedSportSlug}`;
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
      {
        label: labels.casualPlayFinder ?? "Casual plays",
        path: `${basePath}/casual-plays`,
      },
    ];
    return definitions.map((definition) => ({
      ...definition,
      href: buildLocalizedPath(definition.path, locale),
    }));
  }, [
    activeSport,
    resolvedSportSlug,
    labels.sportHome,
    labels.brand,
    labels.courtFinder,
    labels.groupFinder,
    labels.casualPlayFinder,
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
    "relative w-full border-b border-white/20 bg-[linear-gradient(120deg,#0b8f68_0%,#08815f_48%,#066049_100%)] py-3 px-4 text-sm text-[var(--rt-primary-text)] shadow-[0_8px_24px_rgb(var(--foreground-rgb)/0.08)] transition-all duration-300 md:px-8";

  return (
    <>
      <header className={headerClass}>
      <div className="relative z-20 mx-auto flex w-full max-w-screen-xl flex-col gap-2">
        <div className="flex flex-col gap-2 min-[1000px]:flex-row min-[1000px]:items-center min-[1000px]:justify-between">
          <div className="flex w-full items-center justify-between gap-4 min-[1000px]:w-auto min-[1000px]:gap-6">
            <Link
              href={buildLocalizedPath("/", locale)}
              className="flex items-center gap-3"
            >
              <SportBallMark
                sportCode={resolvedSportSlug}
                label={autoSubLabel}
                accent={activeSport?.accent}
                compact
              />
              <div className="text-left">
                <p className="text-lg font-semibold text-white">
                  {labels.brand}
                </p>
                <p className="text-[11px] font-semibold uppercase text-[rgb(var(--rt-primary-text-rgb)/0.75)]">
                  <span style={{ color: "#e6fff8" }}>
                    {resolvedSubLabel}
                  </span>
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 min-[1000px]:hidden"
              aria-label="Open navigation menu"
            >
              <Menu
                className="h-5 w-5"
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>
          {navLinks.length > 0 && (
            <nav className="hidden flex-wrap items-center gap-6 text-sm font-semibold text-white min-[1000px]:flex">
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
                      isLinkActive ? "text-white" : "text-white/90 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="hidden flex-wrap items-center justify-end gap-2 min-[1000px]:flex">
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
                  <ChevronDown
                    className={`h-4 w-4 transition ${menuOpen ? "rotate-180" : ""}`}
                    strokeWidth={1.8}
                    aria-hidden
                  />
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
                        <ExternalLink
                          className="h-4 w-4"
                          strokeWidth={1.8}
                          aria-hidden
                        />
                      </Link>
                      {isAdmin && (
                        <Link
                          href={buildLocalizedPath("/admin", locale)}
                          className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-[var(--foreground)] hover:bg-[rgb(var(--foreground-rgb)/0.1)]"
                          onClick={() => setMenuOpen(false)}
                        >
                          {labels.admin}
                          <ExternalLink
                            className="h-4 w-4"
                            strokeWidth={1.8}
                            aria-hidden
                          />
                        </Link>
                      )}
                      <Link
                        href={buildLocalizedPath("/dashboard", locale)}
                        className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-[var(--foreground)] hover:bg-[rgb(var(--foreground-rgb)/0.1)]"
                        onClick={() => setMenuOpen(false)}
                      >
                        {labels.dashboard}
                        <ExternalLink
                          className="h-4 w-4"
                          strokeWidth={1.8}
                          aria-hidden
                        />
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
              <div className="hidden items-center gap-2 min-[1000px]:flex">
                <Link
                  href={buildLocalizedPath("/login", locale)}
                  className="rounded-full border border-emerald-100/75 bg-white px-4 py-2 font-semibold text-emerald-900 hover:border-emerald-300"
                >
                  {labels.login}
                </Link>
              </div>
            )}
            <div className="relative hidden min-[1000px]:block" ref={localeMenuRef}>
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
                  unoptimized
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
                        unoptimized
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
      <SiteHeaderMobileMenu
        isOpen={mobileNavOpen}
        navLinks={navLinks}
        pathname={pathname}
        locale={locale}
        labels={{
          brand: labels.brand,
          login: labels.login,
          profile: labels.profile,
          dashboard: labels.dashboard,
          admin: labels.admin,
          logout: labels.logout,
          language: labels.language,
        }}
        subLabel={resolvedSubLabel}
        sportMark={{
          code: resolvedSportSlug,
          label: autoSubLabel,
          accent: activeSport?.accent,
        }}
        notificationCopy={notificationCopy}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        user={user}
        localeInfo={LOCALE_INFO}
        mobileMenuRef={mobileMenuRef}
        onClose={closeMobileNav}
        onLocaleSelect={handleLocaleSelect}
        onLogout={handleLogout}
      />
    </>
  );
}
