import { CONTACT_METHODS, buildPlayerContactHref, type PlayerContacts, type ContactMethod } from "@/lib/player-contacts";

export function PlayerContactLinks({ contacts, preferred, labels }: {
  contacts: PlayerContacts;
  preferred?: ContactMethod | null;
  labels: Record<ContactMethod, string>;
}) {
  const methods = CONTACT_METHODS.filter((method) => contacts[method]);
  if (!methods.length) return null;
  const ordered = [...methods].sort((a, b) => Number(b === preferred) - Number(a === preferred));
  return <div className="mb-3 flex flex-wrap gap-2">
    {ordered.map((method) => <a key={method} href={buildPlayerContactHref(method, contacts[method]!)}
      target={method === "phone" ? undefined : "_blank"} rel="noopener noreferrer nofollow"
      className={`rt-pill inline-flex min-h-11 items-center px-3 py-2 text-sm font-semibold ${method === preferred ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "text-slate-700"}`}>
      {labels[method]}
    </a>)}
  </div>;
}
