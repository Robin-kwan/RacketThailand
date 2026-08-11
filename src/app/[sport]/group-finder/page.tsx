import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  GroupFinder,
  GroupFinderNearbyTodayButton,
} from "@/components/group-finder";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { SportFinderHero } from "@/components/sport-finder-hero";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { getSportMeta } from "@/data/sportMeta";
import { buildLocalizedPath, getTranslator, normalizeLocale } from "@/lib/i18n";
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";
import { getSeoKeyword } from "@/lib/seoKeywords";
import { fetchGroupsBySport } from "@/server/groupFinder";

type Params = { sport: string };
type ParamsInput = Promise<Params>;
type SearchParams = {
  lang?: string;
  search?: string;
  date?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  playFormat?: string;
  allowWalkIn?: string;
};
type SearchParamsInput = Promise<SearchParams> | undefined;

function sanitizeQueryParam(value?: string) {
  return typeof value === "string" ? value.trim() : "";
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

type DayKey = (typeof DAY_KEYS)[number];

function isDayKey(value: string): value is DayKey {
  return DAY_KEYS.includes(value as DayKey);
}

function getThaiGroupFinderIntent(sportCode: string, sportName: string) {
  const intents: Record<string, string> = {
    badminton: "ค้นหาก๊วนแบด",
    padel: "ค้นหากลุ่มพาเดล",
    pickleball: "ค้นหากลุ่มพิคเคิลบอล",
    tennis: "ค้นหากลุ่มเทนนิส",
    tabletennis: "ค้นหากลุ่มปิงปอง",
  };

  const intent = intents[sportCode];
  if (intent) {
    return intent;
  }

  return `ค้นหากลุ่ม${sportName}`;
}

function getEnglishGroupFinderIntent(sportCode: string, sportName: string) {
  const intents: Record<string, string> = {
    badminton: "Find badminton groups",
    padel: "Find padel groups",
    pickleball: "Find pickleball groups",
    tennis: "Find tennis groups",
    tabletennis: "Find table tennis groups",
  };

  return intents[sportCode] ?? `Find ${sportName} groups`;
}

async function resolveParams(params: ParamsInput): Promise<Params> {
  return params;
}

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}): Promise<Metadata> {
  const resolvedParams = await resolveParams(params);
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const meta = getSportMeta(resolvedParams.sport);
  if (!meta) {
    return {
      title: "Group finder | RacketThailand",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  const searchQuery = sanitizeQueryParam(resolvedSearch?.search);
  const dateFilter = sanitizeQueryParam(resolvedSearch?.date);
  const dayFilter = sanitizeQueryParam(resolvedSearch?.day);
  const startTimeFilter = sanitizeQueryParam(resolvedSearch?.startTime);
  const endTimeFilter = sanitizeQueryParam(resolvedSearch?.endTime);
  const playFormatFilter = sanitizeQueryParam(resolvedSearch?.playFormat);
  const walkInFilter = sanitizeQueryParam(resolvedSearch?.allowWalkIn);
  const hasActiveFilters = Boolean(
    searchQuery ||
      dateFilter ||
      dayFilter ||
      startTimeFilter ||
      endTimeFilter ||
      playFormatFilter ||
      walkInFilter,
  );
  const canonicalPath = `/${resolvedParams.sport}/group-finder`;
  const canonical = buildCanonicalUrl(canonicalPath, locale);
  const alternates = buildLocaleAlternates(canonicalPath);
  const thaiIntent = getThaiGroupFinderIntent(
    resolvedParams.sport,
    meta.name.th,
  );
  const englishIntent = getEnglishGroupFinderIntent(
    resolvedParams.sport,
    meta.name.en,
  );
  const title =
    locale === "th"
      ? `${thaiIntent} | RacketThailand`
      : `${englishIntent} | RacketThailand`;
  const seoKeyword = getSeoKeyword(resolvedParams.sport, locale, "groups");
  const description =
    locale === "th"
      ? resolvedParams.sport === "badminton"
        ? "ค้นหาก๊วนแบดและก๊วนตีแบดที่เปิดรับสมาชิก พร้อมสนาม วันเวลาเล่น ระดับฝีมือ และช่องทางติดต่อผู้จัดก๊วนทั่วไทย"
        : `${thaiIntent} ค้นหากลุ่ม${meta.name[locale]}ที่เปิดรับสมาชิก พร้อมวันเวลาเล่นและข้อมูลติดต่อจากทั่วประเทศไทย ${seoKeyword}`
      : `${englishIntent} in Thailand with schedules, contacts, and nearby map context. ${seoKeyword}`;

  const metaDescription = truncateMetaDescription(description);
  const finderPreviewImage = buildAbsoluteUrl(meta.coverImage);
  const finderPreviewAlt =
    locale === "th"
      ? `${thaiIntent}บน RacketThailand`
      : `${englishIntent} on RacketThailand`;

  return {
    title,
    description: metaDescription,
    robots: hasActiveFilters
      ? {
          index: false,
          follow: true,
        }
      : undefined,
    alternates: {
      canonical,
      languages: alternates,
    },
    openGraph: {
      title,
      description: metaDescription,
      url: canonical,
      type: "website",
      images: [
        {
          url: finderPreviewImage,
          alt: finderPreviewAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: metaDescription,
      images: [finderPreviewImage],
    },
  };
}

export default async function GroupFinderPage({
  params,
  searchParams,
}: {
  params: ParamsInput;
  searchParams?: SearchParamsInput;
}) {
  const resolvedParams = await resolveParams(params);
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const t = await getTranslator(locale);
  const meta = getSportMeta(resolvedParams.sport);
  if (!meta) {
    notFound();
  }

  const searchQuery = sanitizeQueryParam(resolvedSearch?.search);
  const dateFilter = sanitizeQueryParam(resolvedSearch?.date);
  const dayFilter = sanitizeQueryParam(resolvedSearch?.day);
  const startTimeFilter = sanitizeQueryParam(resolvedSearch?.startTime);
  const endTimeFilter = sanitizeQueryParam(resolvedSearch?.endTime);
  const playFormatFilter = sanitizeQueryParam(resolvedSearch?.playFormat);
  const walkInFilter = sanitizeQueryParam(resolvedSearch?.allowWalkIn);
  const hasFinderFilters = Boolean(
    searchQuery ||
      dateFilter ||
      dayFilter ||
      startTimeFilter ||
      endTimeFilter ||
      playFormatFilter ||
      walkInFilter,
  );
  const groupData = await fetchGroupsBySport(
    resolvedParams.sport,
    {
      search: searchQuery || undefined,
      date: dateFilter || undefined,
      day: isDayKey(dayFilter) ? dayFilter : undefined,
      startTime: startTimeFilter || undefined,
      endTime: endTimeFilter || undefined,
      playFormat: playFormatFilter || undefined,
      allowWalkIn: walkInFilter || undefined,
      limit: 12,
    },
    locale,
  );
  if (!groupData.sport) {
    notFound();
  }

  const dayLabels = DAY_KEYS.reduce<Record<string, string>>((acc, day) => {
    acc[day] = t(`groups.days.${day}`);
    return acc;
  }, {});

  const thaiIntent = getThaiGroupFinderIntent(
    resolvedParams.sport,
    meta.name.th,
  );
  const englishIntent = getEnglishGroupFinderIntent(
    resolvedParams.sport,
    meta.name.en,
  );
  const isThaiLocale = locale === "th";
  const copy = {
    title: isThaiLocale ? thaiIntent : englishIntent,
    subtitle: isThaiLocale
      ? `ดู${resolvedParams.sport === "badminton" ? "ก๊วน" : "กลุ่ม"}${meta.name[locale]} พร้อมวันเวลาเล่น สนามประจำ และช่องทางติดต่อ`
      : `Browse ${meta.name[locale]} groups with schedules, regular venues, and contact details.`,
    searchPlaceholder: t("groupFinder.searchPlaceholder"),
    reset: t("groupFinder.reset"),
    emptyTitle: t("groupFinder.emptyTitle"),
    emptyDescription: t("groupFinder.emptyDescription"),
    backLink: t("groupFinder.backLink"),
    sessionsLabel: t("groupFinder.sessionsLabel"),
    scheduleAnytime: t("groupFinder.scheduleAnytime"),
    dateFilterLabel: t("groupFinder.dateFilterLabel"),
    dayFilterLabel: t("groupFinder.dayFilterLabel"),
    anyDayLabel: t("groupFinder.anyDayLabel"),
    startTimeLabel: t("groupFinder.startTimeLabel"),
    endTimeLabel: t("groupFinder.endTimeLabel"),
    timeClearLabel: t("groupFinder.timeClearLabel"),
    playFormatFilterLabel: t("groupFinder.playFormatFilterLabel"),
    anyPlayFormatLabel: t("groupFinder.anyPlayFormatLabel"),
    playFormatSingle: t("groups.form.playFormatSingle"),
    playFormatDouble: t("groups.form.playFormatDouble"),
    walkInFilterLabel: t("groupFinder.walkInFilterLabel"),
    anyWalkInLabel: t("groupFinder.anyWalkInLabel"),
    walkInsWelcome: t("groups.detail.walkInsWelcome"),
    walkInsClosed: t("groups.detail.walkInsClosed"),
    nearbyButton: t("groupFinder.nearbyButton"),
    nearbyTodayButton: t("groupFinder.nearbyTodayButton"),
    nearbyFinding: t("groupFinder.nearbyFinding"),
    nearbyClear: t("groupFinder.nearbyClear"),
    nearbyUnsupported: t("groupFinder.nearbyUnsupported"),
    nearbyDenied: t("groupFinder.nearbyDenied"),
    nearbyActive: t("groupFinder.nearbyActive"),
    distanceLabel: t("groupFinder.distanceLabel"),
    mapHeading: t("groupFinder.mapHeading"),
    nearbyListTitle: t("groupFinder.nearbyListTitle"),
    openMaps: t("groupFinder.openMaps"),
    playerAmountLabel: t("groups.detail.playerAmount"),
    phoneLabel: t("groups.detail.phone"),
    lineLabel: t("groups.detail.line"),
    createGroupCta: t("header.createGroup"),
    playerFinderCta: t("header.playerFinder"),
  };
  const isBadmintonThai = isThaiLocale && resolvedParams.sport === "badminton";
  const groupFinderUrl = buildCanonicalUrl(
    `/${resolvedParams.sport}/group-finder`,
    locale,
  );
  const collectionSchema = isBadmintonThai && !hasFinderFilters
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "ก๊วนแบดและก๊วนตีแบดที่เปิดรับสมาชิก",
        description:
          "ค้นหาก๊วนแบดตามสนาม วันเวลาเล่น รูปแบบการเล่น และช่องทางติดต่อผู้จัดก๊วน",
        url: groupFinderUrl,
        inLanguage: "th-TH",
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: groupData.groups.length,
          itemListElement: groupData.groups.map((group, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: group.name ?? "ก๊วนแบด",
            url: buildAbsoluteUrl(`/groups/${group.id}`),
          })),
        },
      }
    : null;
  const faqItems = isBadmintonThai
    ? [
        {
          question: "ก๊วนแบดคืออะไร?",
          answer:
            "ก๊วนแบดคือกลุ่มผู้เล่นแบดมินตันที่นัดเล่นเป็นประจำ โดยแต่ละก๊วนอาจกำหนดสนาม วันเวลา ระดับฝีมือ ค่าใช้จ่าย และรูปแบบการเล่นแตกต่างกัน",
        },
        {
          question: "เลือกก๊วนตีแบดอย่างไรให้เหมาะกับตัวเอง?",
          answer:
            "ตรวจสอบสนามและพื้นที่ วันเวลาเล่น ระดับฝีมือ รูปแบบเดี่ยวหรือคู่ และเงื่อนไขการรับผู้เล่นใหม่ก่อนติดต่อผู้จัดก๊วน",
        },
        {
          question: "ติดต่อเข้าร่วมก๊วนแบดได้อย่างไร?",
          answer:
            "เปิดหน้ารายละเอียดก๊วนที่สนใจ แล้วใช้หมายเลขโทรศัพท์ LINE หรือลิงก์ติดต่อที่ผู้จัดก๊วนระบุไว้เพื่อสอบถามที่ว่างและค่าใช้จ่าย",
        },
      ]
    : [];
  const faqSchema = faqItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-[#f7fbf9] text-slate-900">
      <HeaderSubLabel value={meta.name[locale]} />
      <main>
        {collectionSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c"),
            }}
          />
        )}
        {faqSchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
            }}
          />
        )}
        <SportFinderHero
          sportName={meta.name[locale]}
          sportAccent={meta.accent}
          imageUrl={meta.coverImage}
          title={copy.title}
          description={copy.subtitle}
        >
          <GroupFinderNearbyTodayButton label={copy.nearbyTodayButton} />
          <TrackedLink
            href={buildLocalizedPath(
              `/groups/create?sport=${encodeURIComponent(resolvedParams.sport)}`,
              locale,
            )}
            eventName="sport_cta_click"
            eventPayload={{
              surface: "group_finder_header",
              cta: "create_group",
              sport: resolvedParams.sport,
            }}
            className="rt-btn-group inline-flex items-center justify-center px-5 py-3 text-sm"
          >
            {t("header.createGroup")}
          </TrackedLink>
        </SportFinderHero>
        <section className="px-6 py-10 md:px-10 md:py-12">
          <div className="mx-auto w-full max-w-screen-xl">
            <GroupFinder
              sportCode={resolvedParams.sport}
              locale={locale}
              fallbackImage={meta.coverImage}
              copy={copy}
              dayLabels={dayLabels}
              initialGroups={groupData.groups}
              total={groupData.count}
              initialSearch={searchQuery}
              initialDate={dateFilter}
              initialDay={isDayKey(dayFilter) ? dayFilter : ""}
              initialStartTime={startTimeFilter}
              initialEndTime={endTimeFilter}
              initialPlayFormat={playFormatFilter}
              initialAllowWalkIn={walkInFilter}
            />
          </div>
        </section>
        {isBadmintonThai && (
          <section className="border-t border-slate-200 bg-white px-6 py-10 md:px-10 md:py-12">
            <div className="mx-auto max-w-screen-xl">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  หาก๊วนแบดที่เหมาะกับวัน เวลา และระดับการเล่นของคุณ
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
                  รวมก๊วนแบดและก๊วนตีแบดที่เปิดรับสมาชิกจากหลายสนามทั่วไทย
                  พร้อมตารางเล่นประจำ รูปแบบการเล่น และช่องทางติดต่อผู้จัดก๊วน
                  เพื่อช่วยให้คุณเลือกกลุ่มที่เข้ากับพื้นที่และเวลาที่สะดวกได้ง่ายขึ้น
                </p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
                  <TrackedLink
                    href={buildLocalizedPath("/badminton/court-finder", locale)}
                    eventName="sport_cta_click"
                    eventPayload={{
                      surface: "group_finder_seo_links",
                      cta: "open_court_finder",
                      sport: "badminton",
                    }}
                    className="text-[var(--rt-primary)] hover:text-[var(--rt-primary-border)]"
                  >
                    ค้นหาสนามแบด
                  </TrackedLink>
                  <TrackedLink
                    href={buildLocalizedPath("/badminton/players", locale)}
                    eventName="sport_cta_click"
                    eventPayload={{
                      surface: "group_finder_seo_links",
                      cta: "open_player_finder",
                      sport: "badminton",
                    }}
                    className="text-[var(--rt-primary)] hover:text-[var(--rt-primary-border)]"
                  >
                    หาเพื่อนตีแบด
                  </TrackedLink>
                </div>
                <div className="mt-10 border-t border-slate-200 pt-8">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    คำถามเกี่ยวกับการหาก๊วนแบด
                  </h2>
                  <div className="mt-5 space-y-6">
                    {faqItems.map((item) => (
                      <div key={item.question}>
                        <h3 className="font-semibold text-slate-900">
                          {item.question}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {item.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
