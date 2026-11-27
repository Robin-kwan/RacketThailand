import Link from "next/link";
import { buildLocalizedPath, getTranslator, type Locale } from "@/lib/i18n";
import { locationPath, type LocationKind } from "@/lib/location-directory";
import { fetchLocationNavigation } from "@/server/locationDirectory";

export async function LocationDirectoryLinks({
  sport,
  kind,
  locale,
  compact = false,
}: {
  sport: string;
  kind: LocationKind;
  locale: Locale;
  compact?: boolean;
}) {
  const [directory, t] = await Promise.all([
    fetchLocationNavigation(),
    getTranslator(locale),
  ]);
  const locations = directory
    .filter(
      (entry) =>
        entry.sport === sport &&
        (kind === "courts" ? entry.courtIds : entry.groupIds).length > 0,
    )
    .sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale));
  if (locations.length === 0) return null;
  const title = t(
    kind === "courts"
      ? "locationDiscovery.browseCourts"
      : "locationDiscovery.browseGroups",
  );
  const links = (
    <ul className="mt-4 flex flex-wrap gap-2">
      {locations.map((entry) => (
        <li key={entry.slug}>
          <Link
            prefetch={false}
            href={buildLocalizedPath(locationPath(sport, kind, entry.slug), locale)}
            className="rt-pill inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {entry.name[locale]}
            <span className="rt-text-muted">
              ({(kind === "courts" ? entry.courtIds : entry.groupIds).length})
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
  if (compact) {
    return (
      <nav aria-label={title} className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800 marker:text-[var(--rt-primary)]">
            {title}
          </summary>
          {links}
        </details>
      </nav>
    );
  }
  return (
    <nav
      aria-labelledby={`locations-${kind}`}
      className="rt-card mt-8 p-5 sm:p-6"
    >
      <h2 id={`locations-${kind}`} className="text-lg font-semibold">{title}</h2>
      {links}
    </nav>
  );
}
