import { notFound, permanentRedirect } from "next/navigation";
import { getSportMeta } from "@/data/sportMeta";
import { buildLocalizedPath, normalizeLocale } from "@/lib/i18n";

type Params = Promise<{ sport: string }>;
type SearchParams = Promise<{ lang?: string }> | undefined;

export default async function LegacyCasualPlayFinderPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const { sport } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const locale = normalizeLocale(resolvedSearch?.lang);

  if (!getSportMeta(sport)) notFound();

  permanentRedirect(
    buildLocalizedPath(`/${sport}/players?view=invitations`, locale),
  );
}
