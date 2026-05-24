import type { Locale } from "@/lib/i18n";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type ProvinceRow = {
  id: number;
  name_th: string;
  name_en: string;
};

type DistrictRow = {
  id: number;
  province_id: number;
  name_th: string;
  name_en: string;
};

type ProvinceRecord = ProvinceRow & {
  aliases: Set<string>;
};

type DistrictRecord = DistrictRow & {
  aliases: Set<string>;
};

type ThailandLocationIndex = {
  provincesById: Map<number, ProvinceRecord>;
  provinceIdByAlias: Map<string, number>;
  districtsById: Map<number, DistrictRecord>;
  districtsByProvinceId: Map<number, DistrictRecord[]>;
};

export type ThailandLocationResolution = {
  provinceId: number | null;
  districtId: number | null;
  provinceNameTh: string | null;
  districtNameTh: string | null;
  provinceNameEn: string | null;
  districtNameEn: string | null;
};

type LocalizableThailandLocation = {
  province_id?: number | null;
  district_id?: number | null;
  province?: string | null;
  district?: string | null;
};

let indexPromise: Promise<ThailandLocationIndex> | null = null;

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[().,/\\-]/g, " ")
    .replace(/\s+/g, "");
}

function stripLeadingPrefixes(value: string, prefixes: string[]) {
  let next = value.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of prefixes) {
      if (next.startsWith(prefix)) {
        next = next.slice(prefix.length).trim();
        changed = true;
      }
    }
  }
  return next;
}

function stripEnglishAffixes(value: string) {
  return value
    .trim()
    .replace(/^(province|district|amphoe|amphur|khet)\s+/i, "")
    .replace(/\s+(province|district)$/i, "")
    .trim();
}

function buildAliases(nameTh: string, nameEn: string, isDistrict: boolean) {
  const thaiPrefixes = isDistrict ? ["อำเภอ", "เขต"] : ["จังหวัด"];
  const rawCandidates = [
    nameTh,
    stripLeadingPrefixes(nameTh, thaiPrefixes),
    nameEn,
    stripEnglishAffixes(nameEn),
  ];

  return new Set(
    rawCandidates
      .map((candidate) => normalizeToken(candidate))
      .filter(Boolean),
  );
}

function buildLookupKeys(value: string, isDistrict: boolean) {
  const thaiPrefixes = isDistrict ? ["อำเภอ", "เขต"] : ["จังหวัด"];
  const rawCandidates = [
    value,
    stripLeadingPrefixes(value, thaiPrefixes),
    stripEnglishAffixes(value),
  ];

  return Array.from(
    new Set(
      rawCandidates
        .map((candidate) => normalizeToken(candidate))
        .filter(Boolean),
    ),
  );
}

async function loadIndex(): Promise<ThailandLocationIndex> {
  const supabase = getSupabaseAdminClient();
  const [{ data: provinces, error: provinceError }, { data: districts, error: districtError }] =
    await Promise.all([
      supabase
        .from("provinces")
        .select("id,name_th,name_en")
        .order("id", { ascending: true }),
      supabase
        .from("districts")
        .select("id,province_id,name_th,name_en")
        .order("id", { ascending: true }),
    ]);

  if (provinceError) {
    throw new Error(provinceError.message);
  }
  if (districtError) {
    throw new Error(districtError.message);
  }

  const provincesById = new Map<number, ProvinceRecord>();
  const provinceIdByAlias = new Map<string, number>();
  const districtsById = new Map<number, DistrictRecord>();
  const districtsByProvinceId = new Map<number, DistrictRecord[]>();

  for (const province of (provinces ?? []) as ProvinceRow[]) {
    const record: ProvinceRecord = {
      ...province,
      aliases: buildAliases(province.name_th, province.name_en, false),
    };
    provincesById.set(province.id, record);
    for (const alias of record.aliases) {
      provinceIdByAlias.set(alias, province.id);
    }
  }

  for (const district of (districts ?? []) as DistrictRow[]) {
    const record: DistrictRecord = {
      ...district,
      aliases: buildAliases(district.name_th, district.name_en, true),
    };
    districtsById.set(district.id, record);
    const bucket = districtsByProvinceId.get(district.province_id) ?? [];
    bucket.push(record);
    districtsByProvinceId.set(district.province_id, bucket);
  }

  return {
    provincesById,
    provinceIdByAlias,
    districtsById,
    districtsByProvinceId,
  };
}

export async function resolveThailandLocationIds(input: {
  province?: string | null;
  district?: string | null;
}): Promise<ThailandLocationResolution> {
  if (!indexPromise) {
    indexPromise = loadIndex();
  }

  const index = await indexPromise;
  const provinceKeys = input.province
    ? buildLookupKeys(input.province, false)
    : [];
  const districtKeys = input.district
    ? buildLookupKeys(input.district, true)
    : [];

  const provinceId =
    provinceKeys.find((key) => index.provinceIdByAlias.has(key)) != null
      ? index.provinceIdByAlias.get(
          provinceKeys.find((key) => index.provinceIdByAlias.has(key))!,
        ) ?? null
      : null;
  const provinceRecord = provinceId
    ? (index.provincesById.get(provinceId) ?? null)
    : null;

  let districtRecord: DistrictRecord | null = null;
  if (provinceId && districtKeys.length > 0) {
    districtRecord =
      index.districtsByProvinceId
        .get(provinceId)
        ?.find((record) =>
          districtKeys.some((key) => record.aliases.has(key)),
        ) ?? null;
  }

  return {
    provinceId,
    districtId: districtRecord?.id ?? null,
    provinceNameTh: provinceRecord?.name_th ?? null,
    districtNameTh: districtRecord?.name_th ?? null,
    provinceNameEn: provinceRecord?.name_en ?? null,
    districtNameEn: districtRecord?.name_en ?? null,
  };
}

function pickLocalizedName(
  locale: Locale,
  thaiName: string | null | undefined,
  englishName: string | null | undefined,
  fallbackName: string | null | undefined,
) {
  const preferred =
    locale === "en"
      ? [englishName, thaiName, fallbackName]
      : [thaiName, englishName, fallbackName];
  return preferred.find(
    (value): value is string => Boolean(value && value.trim()),
  ) ?? null;
}

export async function localizeThailandLocation(
  input: LocalizableThailandLocation,
  locale: Locale,
) {
  if (!indexPromise) {
    indexPromise = loadIndex();
  }

  const index = await indexPromise;
  const provinceId =
    typeof input.province_id === "number" ? input.province_id : null;
  const districtId =
    typeof input.district_id === "number" ? input.district_id : null;
  const provinceRecord = provinceId
    ? (index.provincesById.get(provinceId) ?? null)
    : null;
  const districtRecord = districtId
    ? (index.districtsById.get(districtId) ?? null)
    : null;

  return {
    province: pickLocalizedName(
      locale,
      provinceRecord?.name_th ?? null,
      provinceRecord?.name_en ?? null,
      input.province ?? null,
    ),
    district: pickLocalizedName(
      locale,
      districtRecord?.name_th ?? null,
      districtRecord?.name_en ?? null,
      input.district ?? null,
    ),
  };
}
