import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HeaderConfigProvider } from "@/components/header-context";
import { SiteHeader } from "@/components/site-header";
import { ToasterProvider } from "@/components/toaster-provider";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ScrollReset } from "@/components/scroll-reset";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RacketThailand | Racket Sports Community",
  description:
    "Discover courts, groups, matches, and community updates for every racket sport in Thailand.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let profile: {
    status: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("status,display_name,avatar_url")
      .eq("id", user.id)
      .single();
    profile = data ?? null;
  }
  const isAdmin = profile?.status === "admin";
  const headerUser = user
    ? {
        email: user.email ?? "",
        avatarUrl:
          profile?.avatar_url ??
          (user.user_metadata?.avatar_url as string | null) ??
          null,
        fullName:
          profile?.display_name ??
          (user.user_metadata?.full_name as string | null) ??
          null,
      }
    : null;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <HeaderConfigProvider>
          <ScrollReset />
          <ToasterProvider />
          <div className="sticky top-0 z-50 w-full">
            <SiteHeader user={headerUser} isAdmin={isAdmin} />
          </div>
          <div className="w-full" aria-hidden="true" />
          <div className="min-h-screen">{children}</div>
          <footer className="border-t border-slate-800 bg-[#010616] text-slate-400">
            <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-sm md:flex-row md:items-center md:justify-between md:px-10">
              <p>RacketThailand · © {new Date().getFullYear()}</p>
              <a
                href="mailto:racketthailand@gmail.com"
                className="text-emerald-300 hover:text-emerald-200"
              >
                Contact us: racketthailand@gmail.com
              </a>
            </div>
          </footer>
        </HeaderConfigProvider>
      </body>
    </html>
  );
}
