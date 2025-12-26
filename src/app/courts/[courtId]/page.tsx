import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { CourtGallery } from "@/components/court-gallery";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { SPORT_META } from "@/data/sportMeta";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchCourtDetail } from "@/server/courtFinder";
import { CourtMap } from "@/components/court-map";
import { ensureAllDays } from "@/lib/opening-hours";

function getGroupCover(group: {
  sports?: { code: string } | null;
  group_photos?: { image_url: string | null; is_primary: boolean | null }[] | null;
}) {
  const primary =
    group.group_photos?.find((photo) => photo.is_primary)?.image_url ??
    group.group_photos?.[0]?.image_url;
  if (primary) {
    return primary;
  }
  const fallbackCode = group.sports?.code ?? "";
  return SPORT_META[fallbackCode]?.coverImage ?? "/sports/badminton.svg";
}

const DAY_LABELS: Record<string, { en: string; th: string }> = {
  sunday: { en: "Sunday", th: "วันอาทิตย์" },
  monday: { en: "Monday", th: "วันจันทร์" },
  tuesday: { en: "Tuesday", th: "วันอังคาร" },
  wednesday: { en: "Wednesday", th: "วันพุธ" },
  thursday: { en: "Thursday", th: "วันพฤหัสบดี" },
  friday: { en: "Friday", th: "วันศุกร์" },
  saturday: { en: "Saturday", th: "วันเสาร์" },
};

function getDayLabel(day: string, locale: string) {
  const lang = locale === "th" ? "th" : "en";
  return DAY_LABELS[day]?.[lang] ?? day;
}

function formatTimeValue(value: string, locale: string) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }
  const formatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    { hour: "numeric", minute: "2-digit" },
  );
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatter.format(date);
}

function isClockValue(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function formatRangeDisplay(
  open: string,
  close: string | null,
  locale: string,
) {
  if (open === "Open" && !close) {
    return locale === "th" ? "เปิดตลอดเวลา" : "Open 24 hours";
  }
  if (!close) {
    return isClockValue(open) ? formatTimeValue(open, locale) : open;
  }
  const formattedOpen = isClockValue(open)
    ? formatTimeValue(open, locale)
    : open;
  const formattedClose = isClockValue(close)
    ? formatTimeValue(close, locale)
    : close;
  return `${formattedOpen} – ${formattedClose}`;
}

function formatTimeRange(start: string, end: string, locale: string) {
  return `${formatTimeValue(start, locale)} – ${formatTimeValue(
    end,
    locale,
  )}`;
}

type Params = {
  courtId: string;
};

type ParamsInput = Promise<Params>;
type SearchParams = { lang?: string };
type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveParams(params: ParamsInput): Promise<Params> {
  return params;
}

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function CourtPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(resolvedParams.courtId)) {
    notFound();
  }
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const detail = await fetchCourtDetail(resolvedParams.courtId);
  if (!detail || !detail.court) {
    notFound();
  }

  const gallery = detail.photos.length
    ? detail.photos
    : [
        {
          id: "placeholder",
          image_url: "/sports/badminton.svg",
          is_primary: true,
        },
      ];

  const openingHourEntries = ensureAllDays(detail.court.opening_hours);
  const hasAnyHours = openingHourEntries.some(
    (entry) => entry.ranges.length > 0,
  );
  const numericLatitude =
    detail.court.latitude !== undefined && detail.court.latitude !== null
      ? Number(detail.court.latitude)
      : null;
  const numericLongitude =
    detail.court.longitude !== undefined && detail.court.longitude !== null
      ? Number(detail.court.longitude)
      : null;
  const hasMapCoordinates =
    typeof numericLatitude === "number" &&
    !Number.isNaN(numericLatitude) &&
    typeof numericLongitude === "number" &&
    !Number.isNaN(numericLongitude);
  const todayKey = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();

  const copy = {
    contact: t("courtPage.contact"),
    address: t("courtPage.address"),
    price: t("courtPage.price"),
    phone: t("courtPage.phone"),
    line: t("courtPage.line"),
    website: t("courtPage.website"),
    hours: t("courtPage.hours"),
    back: t("courtPage.back"),
    groupsTitle: t("courtPage.groupsTitle"),
    groupsEmpty: t("courtPage.groupsEmpty"),
    verified: t("courtPage.verified"),
    statusPending: t("courtPage.statusPending"),
    statusRejected: t("courtPage.statusRejected"),
    noteLabel: t("courtPage.note"),
    edit: t("courtPage.edit"),
    updated: t("courtPage.updated"),
    groupScheduleAny: t("groups.detail.scheduleAny"),
  };

  const canEdit =
    user?.id && detail.court.created_by ? user.id === detail.court.created_by : false;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <HeaderSportScope sportSlug={detail.sport?.code ?? undefined} />
      <HeaderSubLabel value={detail.sport?.name ?? undefined} />
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 pb-20 pt-10 md:px-10">
        <Link
          href={buildLocalizedPath(
            `/${detail.sport?.code ?? ""}`,
            locale,
          )}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
        >
          ← {copy.back}
        </Link>
        <header className="space-y-3 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-semibold text-slate-900">
                {detail.court.name ?? "Unnamed court"}
              </h1>
              <p className="text-sm text-slate-600">
                {[detail.court.district, detail.court.province]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {canEdit && (
              <Link
                href={buildLocalizedPath(
                  `/courts/${resolvedParams.courtId}/edit`,
                  locale,
                )}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
              >
                {copy.edit}
              </Link>
            )}
          </div>
        </header>
        <CourtGallery gallery={gallery} courtName={detail.court.name} />

        <section className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/70 backdrop-blur">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              {copy.contact}
            </h2>
            <ul className="space-y-3 text-sm text-slate-600">
              {detail.court.address && (
                <li>
                  <strong className="text-slate-900">
                    {copy.address}:
                  </strong>{" "}
                  {detail.court.address}
                </li>
              )}
              {detail.court.price_note && (
                <li>
                  <strong className="text-slate-900">
                    {copy.price}:
                  </strong>
                  <div
                    className="prose prose-sm mt-1 max-w-none text-slate-600"
                    dangerouslySetInnerHTML={{
                      __html: detail.court.price_note,
                    }}
                  />
                </li>
              )}
              {hasAnyHours && (
                <li>
                  <strong className="text-slate-900">
                    {copy.hours}:
                  </strong>
                  <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white/60 text-sm">
                    {openingHourEntries.map((entry) => {
                      const normalizedDay = entry.day.toLowerCase().trim();
                      const isToday =
                        normalizedDay.startsWith(todayKey.slice(0, 3)) ||
                        normalizedDay.includes(todayKey);
                      const dayLabel = getDayLabel(normalizedDay, locale);
                      const display =
                        entry.ranges?.length > 0
                          ? entry.ranges
                              .map((range) =>
                                formatRangeDisplay(
                                  range.open,
                                  range.close,
                                  locale,
                                ),
                              )
                              .join(", ")
                          : locale === "th"
                            ? "ปิด"
                            : "Closed";
                      return (
                        <div
                          key={`${entry.day}-${display}`}
                          className={`flex items-center justify-between px-4 py-2 ${isToday ? "bg-emerald-50" : ""}`}
                        >
                          <span
                            className={`text-sm ${isToday ? "font-semibold text-slate-900" : "text-slate-600"}`}
                          >
                            {dayLabel}
                          </span>
                          <span
                            className={`text-sm text-right ${isToday ? "font-semibold text-emerald-700" : "text-slate-600"}`}
                          >
                            {display}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </li>
              )}
              {detail.court.phone && (
                <li>
                  <strong className="text-slate-900">
                    {copy.phone}:
                  </strong>{" "}
                  {detail.court.phone}
                </li>
              )}
              {detail.court.line_id && (
                <li>
                  <strong className="text-slate-900">
                    {copy.line}:
                  </strong>{" "}
                  {detail.court.line_id}
                </li>
              )}
              {detail.court.website_url && (
                <li>
                  <strong className="text-slate-900">
                    {copy.website}:
                  </strong>{" "}
                  <a
                    href={detail.court.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-900 underline"
                  >
                    {detail.court.website_url}
                  </a>
                </li>
              )}
            </ul>
          </div>
          {hasMapCoordinates && (
            <CourtMap
              name={detail.court.name ?? "Court location"}
              latitude={numericLatitude as number}
              longitude={numericLongitude as number}
            />
          )}
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white px-6 py-8 shadow-xl shadow-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {copy.groupsTitle}
          </h2>
          {detail.groups.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">{copy.groupsEmpty}</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {detail.groups.map((group) => {
                const status = group.verification_status ?? "pending";
                const statusLabel =
                  status === "verified"
                    ? copy.verified
                    : status === "rejected"
                      ? copy.statusRejected
                      : copy.statusPending;
                const badgeClass =
                  status === "verified"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : status === "rejected"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-slate-50 text-slate-600";
                const groupLink = group.groups?.id
                  ? buildLocalizedPath(
                      `/groups/${group.groups.id}`,
                      locale,
                    )
                  : null;
                const coverImage = group.groups
                  ? getGroupCover(group.groups)
                  : "/sports/badminton.svg";
                const scheduleEntries =
                  group.groups?.group_sessions &&
                  Array.isArray(group.groups.group_sessions)
                    ? group.groups.group_sessions.filter(
                        (session) => session.court_id === detail.court.id,
                      )
                    : [];
                return (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 shadow-sm shadow-slate-100"
                  >
                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                      {groupLink ? (
                        <Link href={groupLink} className="block">
                          <div className="relative aspect-square w-full">
                            <Image
                              src={coverImage}
                              alt={group.groups?.name ?? "Group photo"}
                              fill
                              sizes="280px"
                              className="object-cover"
                            />
                          </div>
                        </Link>
                      ) : (
                        <div className="relative aspect-square w-full">
                          <Image
                            src={coverImage}
                            alt={group.groups?.name ?? "Group photo"}
                            fill
                            sizes="280px"
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        {groupLink ? (
                          <Link
                            href={groupLink}
                            className="text-base font-semibold text-indigo-600 underline-offset-4 hover:underline"
                          >
                            {group.groups?.name ?? "Community group"}
                          </Link>
                        ) : (
                          <p className="text-base font-semibold text-slate-900">
                            {group.groups?.name ?? "Community group"}
                          </p>
                        )}
                        {group.groups?.description && (
                          <p className="mt-1 text-xs text-slate-500">
                            {group.groups.description}
                          </p>
                        )}
                        <div className="mt-2 text-xs text-slate-500">
                          {scheduleEntries.length > 0 ? (
                            <ul className="space-y-1">
                              {scheduleEntries.map((slot, index) => (
                                <li
                                  key={`${slot.day}-${slot.start_time}-${index}`}
                                >
                                  {getDayLabel(slot.day, locale)} ·{" "}
                                  {slot.start_time && slot.end_time
                                    ? formatTimeRange(
                                        slot.start_time,
                                        slot.end_time,
                                        locale,
                                      )
                                    : copy.groupScheduleAny}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>{copy.groupScheduleAny}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    {group.note && (
                      <p className="mt-3 text-xs italic text-slate-500">
                        {copy.noteLabel}: {group.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <Link
            href={buildLocalizedPath(
              `/${detail.sport?.code ?? ""}/groups`,
              locale,
            )}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            ← {copy.backToGroupFinder}
          </Link>
        </section>
      </main>
    </div>
  );
}
