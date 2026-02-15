import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  const hasSessionCookie = [
    "sb:token",
    "sb:refresh-token",
    "sb-access-token",
    "supabase-auth-token",
  ].some((cookieName) => Boolean(cookieStore.get(cookieName)?.value));

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

  if (hasSessionCookie && !isRecoveryMode) {
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
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <HeaderConfigProvider>
          <ScrollReset />
          <SupabaseAuthListener />
          <ToasterProvider />
          <div className="sticky top-0 z-50 w-full">
            <SiteHeader user={headerUser} isAdmin={isAdmin} />
          </div>
          <div className="w-full" aria-hidden="true" />
          <main className="flex-1 text-slate-900">{children}</main>
          <footer className="border-t border-[var(--rt-primary-border)] bg-[var(--rt-primary)] text-[rgb(var(--rt-primary-text-rgb)/0.9)]">
            <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-sm md:flex-row md:items-center md:justify-between md:px-10">
              <p>RacketThailand · © {new Date().getFullYear()}</p>
              <a
                href="mailto:racketthailand@gmail.com"
                className="text-[rgb(var(--rt-primary-text-rgb)/0.75)] hover:text-[rgb(var(--rt-primary-text-rgb)/0.9)]"
              >
                Contact us: racketthailand@gmail.com
              </a>
            </div>
          </footer>
          <Analytics />
          <SpeedInsights />
        </HeaderConfigProvider>
      </body>
    </html>
  );
}
