"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home } from "lucide-react";
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

const LOCALE_INFO: Record<Locale, { label: string; flag: string }> = {
  th: { label: "ไทย", flag: "🇹🇭" },
  en: { label: "English", flag: "🇺🇸" },
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
  const { subLabel: customSubLabel } = useHeaderConfig();
  const locale = normalizeLocale(searchParams?.get("lang"));
  const strings = UI_STRINGS[locale];
  const labels = strings.header;
  const notificationCopy = strings.notifications;
  const autoSubLabel = useMemo(
    () => deriveSportLabel(pathname, locale),
    [pathname, locale],
  );
  const resolvedSubLabel =
    customSubLabel ?? autoSubLabel ?? "racketthailand.com";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
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
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
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

  const isCondensed = scrolled && !isHovering;
  const headerClass = `flex w-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white text-sm text-slate-900 shadow-lg shadow-slate-200 transition-all duration-300 transform-gpu md:flex-row md:items-center md:justify-between ${
    isCondensed
      ? "py-2 px-4 md:px-6 scale-90"
      : "py-4 px-6 md:px-8"
  }`;

  return (
    <header
      className={headerClass}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Link
        href={buildLocalizedPath("/", locale)}
        className="flex items-center gap-4"
      >
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white p-1 shadow-inner shadow-slate-200/70">
          <Image
            src="/logo.svg"
            alt="RacketThailand logo"
            width={44}
            height={44}
            priority
          />
        </div>
        <div className="text-left">
          <p className="text-base font-semibold tracking-wide">
            {labels.brand}
          </p>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            {resolvedSubLabel}
          </p>
        </div>
      </Link>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href={buildLocalizedPath("/badminton", locale)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
          aria-label={labels.badmintonHome ?? "Badminton"}
        >
          <Home className="h-5 w-5" aria-hidden="true" />
        </Link>
        {isAuthenticated && (
          <NotificationsMenu locale={locale} copy={notificationCopy} />
        )}
        {isAuthenticated ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-full border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:border-slate-500"
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
                className="absolute right-0 top-full z-50 mt-3 w-60 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-xl shadow-slate-200/80"
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
              className="rounded-full border border-slate-300 px-4 py-2 font-semibold hover:border-slate-500"
            >
              {labels.login}
            </Link>
            <Link
              href={buildLocalizedPath("/signup", locale)}
              className="rounded-full bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
            >
              {labels.signup}
            </Link>
          </div>
        )}
        <div className="relative" ref={localeMenuRef}>
          <button
            type="button"
            onClick={() => setLocaleMenuOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-xl hover:border-slate-500"
            aria-label={LOCALE_INFO[locale].label}
          >
            <span aria-hidden>{LOCALE_INFO[locale].flag}</span>
          </button>
          {localeMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-xl shadow-slate-200/80">
              {(Object.keys(LOCALE_INFO) as Locale[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleLocaleSelect(option)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-50 ${option === locale ? "font-semibold text-slate-900" : "text-slate-600"}`}
                >
                  <span>{LOCALE_INFO[option].flag}</span>
                  <span>{LOCALE_INFO[option].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
