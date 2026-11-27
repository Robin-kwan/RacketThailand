import type { GroupSessionRecord } from "@/server/groupFinder";

type DatedSession = {
  starts_at: string;
  ends_at: string | null;
  courts?: GroupSessionRecord["courts"];
};

export function getLocationGroupSessions(
  recurring: GroupSessionRecord[],
  events: DatedSession[],
  province: { provinceId: number; name: { th: string; en: string } },
  now = Date.now(),
): GroupSessionRecord[] {
  const inProvince = (court: GroupSessionRecord["courts"]) => {
    if (!court || court.is_active === false) return false;
    if (court.province_id) return court.province_id === province.provinceId;
    return (
      court.province === province.name.th || court.province === province.name.en
    );
  };
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dated = events
    .filter(
      (event) =>
        inProvince(event.courts) &&
        Number.isFinite(Date.parse(event.starts_at)) &&
        Date.parse(event.ends_at ?? event.starts_at) > now,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((event) => ({
      day: "",
      date: date.format(new Date(event.starts_at)),
      start_time: time.format(new Date(event.starts_at)),
      end_time: event.ends_at ? time.format(new Date(event.ends_at)) : null,
      courts: event.courts,
    }));
  return [
    ...dated,
    ...recurring.filter((session) => inProvince(session.courts)),
  ];
}
