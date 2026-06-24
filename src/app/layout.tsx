import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { HeaderConfigProvider } from "@/components/header-context";
import { SiteHeader } from "@/components/site-header";
import { ToasterProvider } from "@/components/toaster-provider";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSiteUrl } from "@/lib/seo";
import { ScrollReset } from "@/components/scroll-reset";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SupabaseAuthListener } from "@/components/supabase-auth-listener";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "RacketThailand | Racket Sports Community",
  description:
    "Discover courts, groups, and community updates for every racket sport in Thailand.",
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const isRecoveryMode = cookieStore.get("rt-recovery")?.value === "1";

  let profile: {
    status: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null = null;
  let headerUser: {
    email: string;
    avatarUrl: string | null;
    fullName: string | null;
  } | null = null;
  let isAdmin = false;

  if (!isRecoveryMode) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("status,display_name,avatar_url")
        .eq("id", user.id)
        .single();
      profile = data ?? null;
      isAdmin = profile?.status === "admin";
      headerUser = {
        email: user.email ?? "",
        avatarUrl:
          profile?.avatar_url ??
          (user.user_metadata?.avatar_url as string | null) ??
          null,
        fullName:
          profile?.display_name ??
          (user.user_metadata?.full_name as string | null) ??
          null,
      };
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansThai.variable} flex min-h-screen flex-col antialiased`}
      >
        <Script id="pending-auth-redirect" strategy="beforeInteractive">
          {`
            (function () {
              try {
                if (window.location.pathname !== "/") return;
                var key = "rt-pending-auth-redirect";
                var pending = window.sessionStorage.getItem(key);
                if (!pending) return;
                var redirectPath = pending;
                try {
                  var parsed = JSON.parse(pending);
                  if (parsed && typeof parsed.path === "string") {
                    redirectPath = parsed.path;
                  }
                } catch (_) {}
                if (!redirectPath || redirectPath.charAt(0) !== "/" || redirectPath.indexOf("//") === 0) {
                  window.sessionStorage.removeItem(key);
                  return;
                }
                var targetUrl = new URL(redirectPath, window.location.origin);
                var normalizedPath = targetUrl.pathname.replace(/\\/+$/, "") || "/";
                if (
                  normalizedPath === "/" ||
                  normalizedPath === "/login" ||
                  normalizedPath === "/signup" ||
                  normalizedPath === "/verify" ||
                  normalizedPath.indexOf("/auth/") === 0
                ) {
                  window.sessionStorage.removeItem(key);
                  return;
                }
                var target = targetUrl.pathname + targetUrl.search + targetUrl.hash;
                var current = window.location.pathname + window.location.search + window.location.hash;
                if (target !== current) {
                  window.location.replace(target);
                }
              } catch (_) {}
            })();
          `}
        </Script>
        <HeaderConfigProvider>
          <ScrollReset />
          <SupabaseAuthListener />
          <ToasterProvider />
          <div className="sticky top-0 z-50 w-full">
            <SiteHeader user={headerUser} isAdmin={isAdmin} />
          </div>
          <div className="w-full" aria-hidden="true" />
          <main className="rt-main-shell flex-1 text-slate-900">{children}</main>
          <footer className="border-t border-emerald-100/60 bg-[linear-gradient(120deg,#066049_0%,#087657_48%,#0b8f68_100%)] text-[rgb(var(--rt-primary-text-rgb)/0.94)] shadow-[0_-14px_44px_rgb(var(--foreground-rgb)/0.14)]">
            <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-7 text-sm md:flex-row md:items-center md:justify-between md:px-10">
              <p>RacketThailand | © {new Date().getFullYear()}</p>
              <div className="flex flex-col gap-2 md:items-end">
                <Link
                  href="/terms"
                  className="text-[rgb(var(--rt-primary-text-rgb)/0.8)] hover:text-[rgb(var(--rt-primary-text-rgb)/0.95)]"
                >
                  Terms & conditions
                </Link>
                <a
                  href="mailto:racketthailand@gmail.com"
                  className="text-[rgb(var(--rt-primary-text-rgb)/0.8)] hover:text-[rgb(var(--rt-primary-text-rgb)/0.95)]"
                >
                  Contact us: racketthailand@gmail.com
                </a>
              </div>
            </div>
          </footer>
          <Analytics />
          <SpeedInsights />
        </HeaderConfigProvider>
      </body>
    </html>
  );
}
