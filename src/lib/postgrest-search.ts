const POSTGREST_FILTER_CONTROL_CHARS = /[%*(),]/g;

export function buildPostgrestIlikeTerm(query: string) {
  const sanitized = query
    .replace(POSTGREST_FILTER_CONTROL_CHARS, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (!sanitized) return undefined;
  return `*${sanitized}*`;
}
