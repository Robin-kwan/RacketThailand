"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { buildLocalizedPath, type Locale } from "@/lib/i18n";
import { NotificationsMenu } from "@/components/notifications-menu";
import type { NotificationCopy } from "@/components/notifications-menu";

export type MenuLink = {
  label: string;
  path: string;
  href: string;
};

export type HeaderUserLite = {
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
};

export type LocaleInfo = Record<
  Locale,
  {
    label: string;
    flag: string;
    icon: string;
  }
>;

export type MobileMenuLabels = {
  brand: string;
  home: string;
  login: string;
  profile: string;
  dashboard: string;
  admin: string;
  logout: string;
  language: string;
};

export type MobileNavDrawerProps = {
  isOpen: boolean;
  navLinks: MenuLink[];
  pathname: string;
  locale: Locale;
  labels: MobileMenuLabels;
  subLabel: string;
  notificationCopy: NotificationCopy;
  isAuthenticated: boolean;
  isAdmin: boolean;
  user?: HeaderUserLite | null;
  localeInfo: LocaleInfo;
  mobileMenuRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onLocaleSelect: (locale: Locale) => void;
  onLogout: () => void;
};

export function SiteHeaderMobileMenu({
  isOpen,
  navLinks,
  pathname,
  locale,
  labels,
  notificationCopy,
  isAuthenticated,
  isAdmin,
  user,
  localeInfo,
  mobileMenuRef,
  onClose,
  onLocaleSelect,
  onLogout,
  subLabel,
}: MobileNavDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999] flex md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close menu overlay"
        onClick={onClose}
      />
      <aside
        ref={mobileMenuRef}
        className="relative ml-auto flex h-full w-80 flex-col gap-6 border-l border-slate-200 bg-white p-6 text-slate-900"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              {labels.brand}
            </p>
            <p className="text-xs font-semibold uppercase text-slate-400">
              {subLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 p-3 text-slate-500 hover:border-slate-400"
            aria-label="Close menu"
          >
            <X
              className="h-4 w-4"
              strokeWidth={1.8}
              aria-hidden
            />
          </button>
        </div>
        <nav className="space-y-3">
            <Link
              href={buildLocalizedPath("/", locale)}
              onClick={onClose}
              className={`flex items-center justify-between text-base font-semibold ${
                pathname === "/"
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {labels.home}
              {pathname === "/" && (
                <Check
                  className="h-4 w-4"
                  strokeWidth={2}
                  aria-hidden
                />
              )}
            </Link>
            {navLinks.map((link) => {
              const isLinkActive =
                pathname === link.path ||
                (link.path !== "/" && pathname.startsWith(`${link.path}/`));
              return (
                <Link
                  key={link.path}
                  href={link.href}
                  onClick={onClose}
                  className={`flex items-center justify-between text-base font-semibold ${
                    isLinkActive ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                  {isLinkActive && (
                    <Check
                      className="h-4 w-4"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                </Link>
                );
              })}
        </nav>
        <div className="space-y-5">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-200 text-white">
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.fullName ?? user.email}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-lg font-semibold text-slate-500">
                      {user?.fullName?.[0]?.toUpperCase() ??
                        user?.email?.[0]?.toUpperCase() ??
                        "R"}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.fullName ?? user?.email}
                  </p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {notificationCopy.title}
                  </p>
                  <NotificationsMenu locale={locale} copy={notificationCopy} />
                </div>
              </div>
              <Link
                href={buildLocalizedPath("/profile/edit", locale)}
                className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"
                onClick={onClose}
              >
                {labels.profile}
              </Link>
              <Link
                href={buildLocalizedPath("/dashboard", locale)}
                className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"
                onClick={onClose}
              >
                {labels.dashboard}
              </Link>
              {isAdmin && (
                <Link
                  href={buildLocalizedPath("/admin", locale)}
                  className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"
                  onClick={onClose}
                >
                  {labels.admin}
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-rose-500"
              >
                {labels.logout}
              </button>
            </>
          ) : (
            <Link
              href={buildLocalizedPath("/login", locale)}
              className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"
              onClick={onClose}
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
            {(Object.keys(localeInfo) as Locale[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onLocaleSelect(option)}
                className={`flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold ${
                  option === locale
                    ? "border-slate-600 text-slate-900"
                    : "border-slate-200 text-slate-500"
                }`}
              >
                {localeInfo[option].label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
