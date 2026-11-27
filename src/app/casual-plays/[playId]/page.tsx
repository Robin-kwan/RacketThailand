import { notFound, permanentRedirect } from "next/navigation";
import { getSportMeta } from "@/data/sportMeta";
import { buildLocalizedPath, normalizeLocale } from "@/lib/i18n";
import { supabaseSelect } from "@/lib/supabaseRest";

export default async function LegacyCasualPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ playId: string }>;
  searchParams?: Promise<{ lang?: string }>;
}) {
  const { playId } = await params;
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(playId)) notFound();
  const { data } = await supabaseSelect<{ sports: { code: string } | null }>(
    "casual_plays",
    { select: "sports(code)", id: `eq.${playId}`, limit: "1" },
    { preferCount: false },
  );
  const sport = data[0]?.sports?.code;
  if (!sport || !getSportMeta(sport)) notFound();
  const locale = normalizeLocale((await searchParams)?.lang);
  permanentRedirect(buildLocalizedPath(`/${sport}/group-finder`, locale));
}
