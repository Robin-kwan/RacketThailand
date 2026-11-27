export const CONTACT_METHODS = ["line", "instagram", "facebook", "whatsapp", "phone"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];
export type ContactVisibility = "private" | "public" | "accepted";
export type PlayerContacts = Partial<Record<ContactMethod, string>>;

const HOSTS: Partial<Record<ContactMethod, string[]>> = {
  line: ["line.me", "lin.ee"],
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "messenger.com", "www.messenger.com", "m.me", "fb.me"],
};

export function normalizePlayerContacts(value: unknown): PlayerContacts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: PlayerContacts = {};
  for (const method of CONTACT_METHODS) {
    const raw = (value as Record<string, unknown>)[method];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const text = raw.trim();
    if (text.length > 300) throw new Error("INVALID_CONTACT");
    if (method === "phone" || method === "whatsapp") {
      const phone = text.replace(/[\s()\-]/g, "");
      if (!/^\+?[0-9]{8,15}$/.test(phone)) throw new Error("INVALID_CONTACT");
      if (method === "whatsapp" && !phone.startsWith("+")) throw new Error("INVALID_CONTACT");
      result[method] = phone;
    } else if (method === "line" && /^@?[A-Za-z0-9._-]{1,100}$/.test(text)) {
      result[method] = text;
    } else if (method === "instagram" && /^@?[A-Za-z0-9._]{1,30}$/.test(text)) {
      result[method] = text.replace(/^@/, "");
    } else {
      let url: URL;
      try { url = new URL(text); } catch { throw new Error("INVALID_CONTACT"); }
      if (url.protocol !== "https:" || url.username || url.password || url.port || !HOSTS[method]?.includes(url.hostname)) {
        throw new Error("INVALID_CONTACT");
      }
      result[method] = url.toString();
    }
  }
  return result;
}

export function canViewPlayerContacts(visibility: unknown, owner: boolean, accepted: boolean) {
  return owner || visibility === "public" || (visibility === "accepted" && accepted);
}

export function buildPlayerContactHref(method: ContactMethod, value: string) {
  if (method === "phone") return `tel:${value}`;
  if (method === "whatsapp") return `https://wa.me/${value.replace(/^\+/, "")}`;
  if (value.startsWith("https://")) return value;
  if (method === "line") return `https://line.me/ti/p/~${encodeURIComponent(value)}`;
  if (method === "instagram") return `https://www.instagram.com/${encodeURIComponent(value)}/`;
  return "";
}
