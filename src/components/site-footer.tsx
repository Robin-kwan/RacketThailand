"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildLocalizedPath, normalizeLocale } from "@/lib/i18n";
import { RacketThailandMark } from "@/components/racketthailand-mark";

export function SiteFooter({ year }: { year: number }) {
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("lang"));
  const copy =
    locale === "th"
      ? {
          updates: "อัปเดตล่าสุด",
          terms: "ข้อกำหนดการใช้งาน",
          contact: "ติดต่อเรา",
        }
      : {
          updates: "What's New",
          terms: "Terms & conditions",
          contact: "Contact us",
        };

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-5 px-6 py-7 text-sm md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-center gap-3">
          <RacketThailandMark className="h-9 w-11 shrink-0 overflow-hidden rounded-md" />
          <p className="font-medium text-slate-700">
            RacketThailand | © {year}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 md:justify-end">
          <Link
            href={buildLocalizedPath("/updates", locale)}
            className="transition-colors hover:text-slate-950"
          >
            {copy.updates}
          </Link>
          <Link
            href={buildLocalizedPath("/terms", locale)}
            className="transition-colors hover:text-slate-950"
          >
            {copy.terms}
          </Link>
          <a
            href="mailto:racketthailand@gmail.com"
            className="transition-colors hover:text-slate-950"
          >
            {copy.contact}: racketthailand@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
