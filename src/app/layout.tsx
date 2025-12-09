import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HeaderConfigProvider } from "@/components/header-context";
import { SiteHeader } from "@/components/site-header";
import { ToasterProvider } from "@/components/toaster-provider";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.status === "admin";
  }
  const headerUser = user
    ? {
        email: user.email ?? "",
        avatarUrl: user.user_metadata?.avatar_url ?? null,
        fullName: user.user_metadata?.full_name ?? null,
      }
    : null;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <HeaderConfigProvider>
          <ToasterProvider />
          <div className="sticky top-0 z-50 mx-auto w-full max-w-5xl px-6 pt-6 md:px-10">
            <SiteHeader user={headerUser} isAdmin={isAdmin} />
          </div>
          {children}
        </HeaderConfigProvider>
      </body>
    </html>
  );
}
