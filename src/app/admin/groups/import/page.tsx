import { redirect } from "next/navigation";
import {
  buildLocalizedPath,
  normalizeLocale,
} from "@/lib/i18n";

type SearchParams = {
  lang?: string;
};

type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function LegacyAdminGroupImportPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  redirect(buildLocalizedPath("/admin/group-imports", locale));
}
