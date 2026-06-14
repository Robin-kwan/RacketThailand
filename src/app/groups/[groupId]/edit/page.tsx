import { notFound, redirect } from "next/navigation";
import { OwnershipAssignmentPanel } from "@/components/admin/ownership-assignment-panel";
import { GroupEditForm } from "@/components/groups/group-edit-form";
import { BaseCard } from "@/components/base-card";
import { BaseBackLink } from "@/components/base-back-link";
import { EntityDeleteButton } from "@/components/entity-delete-button";
import type { Option } from "@/components/groups/group-form";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { buildAuthPagePath } from "@/lib/auth-redirect";
import { buildLineQrUploaderCopy } from "@/lib/line-qr-uploader-copy";
import { normalizeGroupStatus } from "@/lib/group-status";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";
import { HeaderSubLabel } from "@/components/header-sub-label";
import { HeaderSportScope } from "@/components/header-sport-scope";
import { SPORT_META } from "@/data/sportMeta";
import { ensureGroupLineQrUrl } from "@/server/lineQr";
import { fetchSportIdsByCourtIds } from "@/server/courtSports";

type Params = { groupId: string };
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

function formatProfileOption(profile: {
  id: string;
  username: string | null;
  display_name: string | null;
}) {
  const username = profile.username?.trim();
  const displayName = profile.display_name?.trim();
  return {
    id: profile.id,
    username,
    displayName,
    label:
      username && displayName
        ? `${username} - ${displayName}`
        : username ?? displayName ?? profile.id.slice(0, 8),
  };
}

export default async function EditGroupPage({
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      buildAuthPagePath("/login", locale, `/groups/${resolvedParams.groupId}/edit`),
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.status === "admin";

  const { data: groupRows } = await supabaseSelect<{
    id: string;
    sport_id: string;
    name: string | null;
    description: string | null;
    status: string | null;
    owner_id: string | null;
    player_amount: number | null;
    phone: string | null;
    line_id: string | null;
    website_url: string | null;
    line_qr_url: string | null;
    play_format: "single" | "double" | null;
    allow_walk_in: boolean | null;
  }>("groups", {
    select:
      "id,sport_id,name,description,status,owner_id,player_amount,phone,line_id,website_url,line_qr_url,play_format,allow_walk_in",
    id: `eq.${resolvedParams.groupId}`,
    limit: "1",
  });
  const group = groupRows?.[0];
  if (!group) {
    notFound();
  }
  const resolvedLineQrUrl = await ensureGroupLineQrUrl(
    group.id,
    group.line_qr_url,
  );

  if (!isAdmin && group.owner_id !== user.id) {
    redirect(buildLocalizedPath(`/groups/${group.id}`, locale));
  }

  const { data: sports } = await supabaseSelect<{
    id: string;
    code: string;
    name: string | null;
  }>("sports", {
    select: "id,code,name",
    order: "name.asc.nullslast",
  });

  const { data: courts } = await supabaseSelect<{
    id: string;
    name: string | null;
    province: string | null;
  }>("courts", {
    select: "id,name,province",
    is_active: "eq.true",
    order: "name.asc.nullslast",
  });

  const { data: sessionRows } = await supabaseSelect<{
    id: string;
    court_id: string;
    day: string;
    start_time: string | null;
    end_time: string | null;
  }>("group_sessions", {
    select: "id,court_id,day,start_time,end_time",
    group_id: `eq.${group.id}`,
    order: "day.asc,start_time.asc",
  });

  const { data: courtGroupRows } = await supabaseSelect<{
    court_id: string;
  }>("court_groups", {
    select: "court_id",
    group_id: `eq.${group.id}`,
  });

  const { data: photoRows } = await supabaseSelect<{
    id: string;
    image_url: string | null;
    is_primary: boolean | null;
  }>("group_photos", {
    select: "id,image_url,is_primary",
    group_id: `eq.${group.id}`,
    order: "is_primary.desc,created_at.asc",
  });

  const { data: ownerRows } = group.owner_id
    ? await supabaseSelect<{
        id: string;
        username: string | null;
        display_name: string | null;
      }>("profiles", {
        select: "id,username,display_name",
        id: `eq.${group.owner_id}`,
        limit: "1",
      })
    : { data: [] };

  const sportOptions =
    sports?.map((sport) => ({
      value: sport.id,
      label: SPORT_META[sport.code]?.name[locale] ?? sport.name ?? sport.code,
    })) ?? [];
  const courtSportIdsByCourtId = await fetchSportIdsByCourtIds(
    courts?.map((court) => court.id) ?? [],
  );

  const courtOptions =
    courts?.reduce<Record<string, Option[]>>((acc, court) => {
      const sportIds = Array.from(
        new Set(courtSportIdsByCourtId.get(court.id) ?? []),
      );
      sportIds.forEach((sportId) => {
        const entry = {
          value: court.id,
          label: court.province
            ? `${court.name ?? "Court"} (${court.province})`
            : court.name ?? "Court",
        };
        acc[sportId] = acc[sportId] ? [...acc[sportId], entry] : [entry];
      });
      return acc;
    }, {}) ?? {};

  const groupedSessions =
    sessionRows?.reduce((acc, session) => {
      const key = session.court_id;
      const slot = {
        id: session.id,
        day: session.day,
        start: session.start_time ?? "",
        end: session.end_time ?? "",
      };
      const existing = acc.get(key);
      if (existing) {
        existing.slots.push(slot);
      } else {
        acc.set(key, {
          id: key,
          courtId: session.court_id,
          slots: [slot],
        });
      }
      return acc;
    }, new Map<string, { id: string; courtId: string; slots: { id: string; day: string; start: string; end: string }[] }>()) ??
    new Map();

  const sportCourtOptions = courtOptions[group.sport_id] ?? [];
  const fallbackCourtId = sportCourtOptions[0]?.value ?? "";
  const linkedCourtIds = Array.from(
    new Set([
      ...((courtGroupRows ?? []).map((row) => row.court_id)),
      ...Array.from(groupedSessions.keys()),
    ]),
  );
  const groupedArray =
    linkedCourtIds.length > 0
      ? linkedCourtIds.map((courtId) => (
          groupedSessions.get(courtId) ?? {
            id: courtId,
            courtId,
            slots: [],
          }
        ))
      : [];
  const sanitizedSessions =
    groupedArray.length > 0
      ? groupedArray.map((block) => {
          const isValid = sportCourtOptions.some(
            (court) => court.value === block.courtId,
          );
          return {
            ...block,
            courtId: isValid ? block.courtId : fallbackCourtId,
          };
        })
      : [];

  const currentSport =
    sports?.find((sport) => sport.id === group.sport_id) ?? null;
  const currentSportSlug = currentSport?.code ?? undefined;
  const currentSportLabel =
    currentSport?.name ?? currentSport?.code ?? undefined;

  const formGroup = {
    id: group.id,
    sportId: group.sport_id,
    name: group.name ?? "",
    description: group.description ?? "",
    status: normalizeGroupStatus(group.status),
    sessions: sanitizedSessions,
    playFormat: group.play_format ?? "double",
    playerAmount:
      typeof group.player_amount === "number"
        ? String(group.player_amount)
        : "",
    allowWalkIn: group.allow_walk_in !== false,
    phone: group.phone ?? "",
    lineId: group.line_id ?? "",
    websiteUrl: group.website_url ?? "",
    lineQrUrl: resolvedLineQrUrl ?? null,
  };

  const dayKeys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  const dayOptions = dayKeys.map((day) => ({
    value: day,
    label: t(`groups.days.${day}`),
  }));

  const copy = {
    sport: t("groups.form.sport"),
    name: t("groups.form.name"),
    description: t("groups.form.description"),
    sessionsLabel: t("groups.form.sessionsLabel"),
    sessionsAddCourt: t("groups.form.sessionsAddCourt"),
    sessionsAddSlot: t("groups.form.sessionsAddSlot"),
    sessionsRemoveCourt: t("groups.form.sessionsRemoveCourt"),
    sessionsEmpty: t("groups.form.sessionsEmpty"),
    sessionCourt: t("groups.form.sessionCourt"),
    noOptionsFound: t("forms.noOptionsFound"),
    scheduleLabel: t("groups.form.scheduleLabel"),
    scheduleOptionalEmpty: t("groups.form.scheduleOptionalEmpty"),
    scheduleRemove: t("groups.form.scheduleRemove"),
    scheduleDay: t("groups.form.scheduleDay"),
    scheduleStart: t("groups.form.scheduleStart"),
    scheduleEnd: t("groups.form.scheduleEnd"),
    playFormatLabel: t("groups.form.playFormatLabel"),
    playFormatSingle: t("groups.form.playFormatSingle"),
    playFormatDouble: t("groups.form.playFormatDouble"),
    playerAmountLabel: t("groups.form.playerAmountLabel"),
    playerAmountPlaceholder: t("groups.form.playerAmountPlaceholder"),
    playerAmountHelp: t("groups.form.playerAmountHelp"),
    allowWalkInLabel: t("groups.form.allowWalkInLabel"),
    allowWalkInHelp: t("groups.form.allowWalkInHelp"),
    contactTitle: t("groups.form.contactTitle"),
    contactHelp: t("groups.form.contactHelp"),
    contactRequirementLabel: t("groups.form.contactRequirementLabel"),
    phoneLabel: t("groups.form.phoneLabel"),
    phonePlaceholder: t("groups.form.phonePlaceholder"),
    lineLabel: t("groups.form.lineLabel"),
    linePlaceholder: t("groups.form.linePlaceholder"),
    websiteLabel: t("groups.form.websiteLabel"),
    websitePlaceholder: t("groups.form.websitePlaceholder"),
    contactRequired: t("groups.form.contactRequired"),
    lineQrLabel: t("groups.form.lineQrLabel"),
    lineQrUploader: buildLineQrUploaderCopy(t),
    photos: t("groups.form.photos"),
    submit: t("groups.edit.submit"),
    submitting: t("groups.edit.submitting"),
    success: t("groups.edit.success"),
    error: t("groups.edit.error"),
    working: t("groups.edit.working"),
    photoAlt: t("groups.edit.photoAlt"),
    primaryPhoto: t("groups.form.primaryPhoto"),
    makePrimaryPhoto: t("groups.form.makePrimaryPhoto"),
    deleteSubmit: t("groups.edit.deleteSubmit"),
    deleting: t("groups.edit.deleting"),
    deleteSuccess: t("groups.edit.deleteSuccess"),
    deleteError: t("groups.edit.deleteError"),
    deleteConfirm: t("groups.edit.deleteConfirm"),
    deleteCancel: t("groups.edit.deleteCancel"),
  };
  const deleteRedirectHref = buildLocalizedPath(
    currentSportSlug ? `/${currentSportSlug}/group-finder` : "/",
    locale,
  );
  const ownerProfile = ownerRows?.[0] ? formatProfileOption(ownerRows[0]) : null;
  const ownershipCopy = {
    title: t("admin.ownership.groupTitle"),
    subtitle: t("admin.ownership.subtitle"),
    currentLabel: t("admin.ownership.currentLabel"),
    searchLabel: t("admin.ownership.searchLabel"),
    searchPlaceholder: t("admin.ownership.searchPlaceholder"),
    searching: t("admin.ownership.searching"),
    noResults: t("admin.ownership.noResults"),
    save: t("admin.ownership.save"),
    saving: t("admin.ownership.saving"),
    success: t("admin.ownership.success"),
    error: t("admin.ownership.error"),
    unchanged: t("admin.ownership.unchanged"),
    unassigned: t("admin.ownership.unassigned"),
  };

  return (
    <div className="rt-page">
      <HeaderSportScope sportSlug={currentSportSlug} />
      <HeaderSubLabel value={currentSportLabel} />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BaseBackLink
            href={buildLocalizedPath(`/groups/${group.id}`, locale)}
          >
            {t("groups.edit.back")}
          </BaseBackLink>
          <EntityDeleteButton
            endpoint={`/api/groups/${group.id}`}
            redirectHref={deleteRedirectHref}
            copy={{
              submit: copy.deleteSubmit,
              deleting: copy.deleting,
              success: copy.deleteSuccess,
              error: copy.deleteError,
              confirm: copy.deleteConfirm,
              cancel: copy.deleteCancel,
            }}
          />
        </div>
        <BaseCard
          as="section"
          className="rounded-[32px] border border-slate-200 bg-white p-8"
        >
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            {t("groups.edit.title")}
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--foreground-rgb)/0.7)]">
            {t("groups.edit.subtitle")}
          </p>
          <div className="mt-6">
            <GroupEditForm
              group={formGroup}
              sports={sportOptions}
              courts={courtOptions}
              dayOptions={dayOptions}
              existingPhotos={photoRows ?? []}
              locale={locale}
              allowStatusEdit={isAdmin}
              copy={copy}
            />
          </div>
        </BaseCard>
        {isAdmin && (
          <OwnershipAssignmentPanel
            entityType="group"
            entityId={group.id}
            currentProfile={ownerProfile}
            copy={ownershipCopy}
          />
        )}
      </main>
    </div>
  );
}
