import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { BaseCard } from "@/components/base-card";
import { CourtGallery } from "@/components/court-gallery";
import { buildLocalizedPath, normalizeLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";

type Detail = {
  id: string;
  name: string;
  description: string;
  status: string;
  owner_id: string | null;
  updated_at: string;
  tournament_start_at: string;
  tournament_end_at: string;
  registration_url: string | null;
  phone: string | null;
  line_id: string | null;
  sports: { code: string; name: string | null } | null;
  courts: {
    id: string;
    name: string;
    address: string | null;
    province: string | null;
  } | null;
  tournament_organizers:
    | {
        id: string;
        organizer_name: string | null;
        phone: string | null;
        line_id: string | null;
        website_url: string | null;
        groups: { id: string; name: string } | null;
      }[]
    | null;
  tournament_photos:
    { id: string; image_url: string; is_primary: boolean }[] | null;
};

async function getTournament(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tournaments")
    .select(
      "id,name,description,status,owner_id,updated_at,tournament_start_at,tournament_end_at,registration_url,phone,line_id,sports(code,name),courts(id,name,address,province),tournament_organizers(id,organizer_name,phone,line_id,website_url,groups(id,name)),tournament_photos(id,image_url,is_primary)",
    )
    .eq("id", id)
    .maybeSingle();
  return data as Detail | null;
}
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams?: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { tournamentId } = await params;
  const locale = normalizeLocale((await searchParams)?.lang);
  const item = await getTournament(tournamentId);
  if (!item) return {};
  const path = `/tournaments/${item.id}`;
  const canonical = buildCanonicalUrl(path, locale);
  const metadataTitle = `RacketThailand • ${item.name}`;
  const heroImage =
    item.tournament_photos?.find((photo) => photo.is_primary)?.image_url ??
    item.tournament_photos?.[0]?.image_url;
  return {
    title: metadataTitle,
    description: truncateMetaDescription(item.description),
    alternates: {
      canonical,
      languages: buildLocaleAlternates(path),
    },
    openGraph: {
      title: metadataTitle,
      description: truncateMetaDescription(item.description),
      url: canonical,
      type: "website",
      images: heroImage ? [heroImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description: truncateMetaDescription(item.description),
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams?: Promise<{ lang?: string }>;
}) {
  const { tournamentId } = await params;
  const locale = normalizeLocale((await searchParams)?.lang);
  const th = locale === "th";
  const item = await getTournament(tournamentId);
  if (!item) notFound();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = Boolean(user?.id && item.owner_id === user.id);
  const fmt = new Intl.DateTimeFormat(th ? "th-TH" : "en-GB", {
    dateStyle: "long",
    timeZone: "Asia/Bangkok",
  });
  const tournamentStart = new Date(item.tournament_start_at);
  const tournamentEnd = new Date(item.tournament_end_at);
  const dateRange = fmt.formatRange(tournamentStart, tournamentEnd);
  const updatedAt = new Intl.DateTimeFormat(th ? "th-TH" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(item.updated_at));
  return (
    <div className="rt-page">
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10 md:px-10">
        <BaseCard className="rounded-lg border border-slate-200 bg-white p-6 md:p-8">
          {item.tournament_photos?.length ? (
            <div className="mb-8">
              <CourtGallery
                gallery={item.tournament_photos}
                courtName={item.name}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-3xl font-semibold">{item.name}</h1>
            {isOwner && (
              <Link
                href={buildLocalizedPath(
                  `/tournaments/${item.id}/edit`,
                  locale,
                )}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
              >
                {th ? "แก้ไข" : "Edit"}
              </Link>
            )}
          </div>
          <p className="mt-5 whitespace-pre-line leading-7 rt-text-muted">
            {item.description}
          </p>
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Clock3 className="h-4 w-4" aria-hidden />
            <span>
              {th ? "อัปเดตล่าสุด" : "Last updated"}: {updatedAt}
            </span>
          </p>
          <div className="mt-8">
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-semibold text-slate-600">
                {th ? "วันแข่งขัน" : "Tournament dates"}
              </h2>
              <p className="mt-3 flex items-start gap-3 text-lg font-semibold text-slate-950">
                <CalendarDays
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                  aria-hidden
                />
                <span>{dateRange}</span>
              </p>
            </section>
          </div>
          {item.courts && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">
                {th ? "สนามแข่งขัน" : "Tournament court"}
              </h2>
              <Link
                className="mt-3 flex items-start gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                href={buildLocalizedPath(`/courts/${item.courts.id}`, locale)}
              >
                <MapPin
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                  aria-hidden
                />
                <span>
                  <strong className="block">{item.courts.name}</strong>
                  <span className="mt-1 block text-sm rt-text-muted">
                    {[item.courts.address, item.courts.province]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            </section>
          )}
          {(item.phone || item.line_id || item.registration_url) && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">
                {th
                  ? "ช่องทางติดต่อและข้อมูลเพิ่มเติม"
                  : "Contact and information"}
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {item.phone && (
                  <a
                    href={`tel:${item.phone}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-sm hover:bg-slate-50"
                  >
                    <Phone
                      className="h-5 w-5 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    <span>
                      <span className="block text-xs text-slate-500">
                        {th ? "โทรศัพท์" : "Phone"}
                      </span>
                      <strong className="mt-1 block">{item.phone}</strong>
                    </span>
                  </a>
                )}
                {item.line_id && (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-sm">
                    <MessageCircle
                      className="h-5 w-5 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    <span>
                      <span className="block text-xs text-slate-500">LINE</span>
                      <strong className="mt-1 block">{item.line_id}</strong>
                    </span>
                  </div>
                )}
                {item.registration_url && (
                  <a
                    href={item.registration_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-sm hover:bg-slate-50"
                  >
                    <ExternalLink
                      className="h-5 w-5 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    <span>
                      <span className="block text-xs text-slate-500">
                        {th ? "ลิงก์ภายนอก" : "External link"}
                      </span>
                      <strong className="mt-1 block">
                        {th ? "ดูข้อมูลเพิ่มเติม" : "More information"}
                      </strong>
                    </span>
                  </a>
                )}
              </div>
            </section>
          )}
          <section className="mt-8">
            <h2 className="text-lg font-semibold">
              {th ? "ผู้จัดการแข่งขัน" : "Organizers"}
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {item.tournament_organizers?.map((o) => (
                <div
                  key={o.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <strong>{o.groups?.name ?? o.organizer_name}</strong>
                  {o.phone && <p className="mt-1 text-sm">{o.phone}</p>}
                  {o.line_id && <p className="text-sm">LINE: {o.line_id}</p>}
                </div>
              ))}
            </div>
          </section>
        </BaseCard>
      </main>
    </div>
  );
}
