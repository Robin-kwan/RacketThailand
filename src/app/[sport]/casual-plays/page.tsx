import { notFound, permanentRedirect } from "next/navigation";
import { getSportMeta } from "@/data/sportMeta";
import { buildLocalizedPath, normalizeLocale } from "@/lib/i18n";

export default async function LegacyCasualPlayFinderPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string }>;
  searchParams?: Promise<{ lang?: string }>;
}) {
  const { sport } = await params;
  if (!getSportMeta(sport)) notFound();
  const locale = normalizeLocale((await searchParams)?.lang);
  permanentRedirect(buildLocalizedPath(`/${sport}/group-finder`, locale));
}
