import { buildLocalizedPath, type Locale } from "./i18n";

export type OwnedGroupSummary = {
  id: string;
  name: string | null;
  sportCode: string | null;
  sportId: string;
  status: string | null;
  updatedAt: string | null;
};

type GroupContributionActionOptions = {
  ownedGroups: OwnedGroupSummary[];
  locale: Locale;
  sportCode?: string | null;
  courtId?: string | null;
};

export type GroupContributionAction = {
  href: string;
  kind: "create_group" | "add_session" | "choose_group";
};

function getGroupsForSport(
  ownedGroups: OwnedGroupSummary[],
  sportCode?: string | null,
) {
  if (!sportCode) return ownedGroups;
  return ownedGroups.filter((group) => group.sportCode === sportCode);
}

export function buildAddGroupSessionHref(
  group: OwnedGroupSummary,
  locale: Locale,
  courtId?: string | null,
) {
  const params = new URLSearchParams();
  if (group.sportCode) params.set("sport", group.sportCode);
  if (courtId) params.set("court", courtId);
  const query = params.size ? `?${params.toString()}` : "";
  return buildLocalizedPath(`/groups/${group.id}${query}#add-session`, locale);
}

export function buildNewGroupHref({
  locale,
  sportCode,
  courtId,
  explicit = false,
}: {
  locale: Locale;
  sportCode?: string | null;
  courtId?: string | null;
  explicit?: boolean;
}) {
  const params = new URLSearchParams();
  if (sportCode) params.set("sport", sportCode);
  if (courtId) params.set("court", courtId);
  if (explicit) params.set("new", "1");
  const query = params.toString();
  return buildLocalizedPath(`/groups/create${query ? `?${query}` : ""}`, locale);
}

export function getGroupContributionAction({
  ownedGroups,
  locale,
  sportCode,
  courtId,
}: GroupContributionActionOptions): GroupContributionAction {
  const relevantGroups = getGroupsForSport(ownedGroups, sportCode);

  if (relevantGroups.length === 0) {
    return {
      kind: "create_group",
      href: buildNewGroupHref({ locale, sportCode, courtId }),
    };
  }

  if (relevantGroups.length === 1) {
    return {
      kind: "add_session",
      href: buildAddGroupSessionHref(relevantGroups[0], locale, courtId),
    };
  }

  const params = new URLSearchParams();
  if (sportCode) params.set("sport", sportCode);
  if (courtId) params.set("court", courtId);
  return {
    kind: "choose_group",
    href: buildLocalizedPath(`/groups/create?${params.toString()}`, locale),
  };
}
