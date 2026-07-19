import { permanentRedirect } from "next/navigation";
import { buildLocalizedPath, normalizeLocale } from "@/lib/i18n";

type SearchParams = Promise<{ lang?: string; sport?: string }> | undefined;

export default async function LegacySportProfilesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(resolved?.lang);
  const profilePath = resolved?.sport
    ? `/profile/edit?sport=${encodeURIComponent(resolved.sport)}#sport-profile`
    : "/profile/edit#sport-profile";

  permanentRedirect(buildLocalizedPath(profilePath, locale));
}
