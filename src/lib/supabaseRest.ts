function getEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export type SupabaseQueryOptions = {
  preferCount?: boolean;
};

export type SupabaseResponse<T> = {
  data: T[];
  count?: number;
};

export async function supabaseSelect<T>(
  table: string,
  searchParams: Record<string, string>,
  options: SupabaseQueryOptions = { preferCount: true },
): Promise<SupabaseResponse<T>> {
  const url = new URL(`${getEnv("SUPABASE_URL")}/rest/v1/${table}`);
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  if (options.preferCount) {
    headers.Prefer = "count=exact";
  }

  const response = await fetch(url, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Supabase request failed for ${table}: ${response.status} ${response.statusText} - ${text}`,
    );
  }

  const data = (await response.json()) as T[];

  const countHeader = response.headers.get("content-range");
  const count = parseCount(countHeader);

  return {
    data,
    count,
  };
}

function parseCount(header: string | null): number | undefined {
  if (!header) return undefined;
  const [, total] = header.split("/");
  if (!total) return undefined;
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : undefined;
}
