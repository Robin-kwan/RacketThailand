import type { Locale } from "@/lib/i18n";

type KeywordType = "hero" | "courts" | "groups";

type KeywordEntry = Partial<Record<KeywordType, Record<Locale, string>>>;

const KEYWORDS: Record<string, KeywordEntry> = {
  badminton: {
    hero: {
      th: "หาคอร์ทแบดใกล้ฉัน หรือ สนามแบดที่อยู่ใกล้คุณ รวมถึงการหาก๊วนตีแบดที่เปิดรับสมาชิกได้ที่นี่",
      en: "Find badminton courts near me and local badminton groups in minutes.",
    },
    courts: {
      th: "หาคอร์ทแบดใกล้ฉัน",
      en: "Find badminton courts near me",
    },
    groups: {
      th: "หาก๊วนตีแบด",
      en: "Join badminton meetup groups near me",
    },
  },
  padel: {
    hero: {
      th: "หาคอร์ทพาเดลใกล้ฉันหรือกลุ่มพาเดลที่กำลังเปิดรับคู่ใหม่",
      en: "Find padel courts near me or doubles groups that are accepting new players.",
    },
    courts: {
      th: "หาคอร์ทพาเดลใกล้ฉัน",
      en: "Find padel courts near me",
    },
    groups: {
      th: "หาก๊วนพาเดล",
      en: "Find padel groups near me",
    },
  },
  pickleball: {
    hero: {
      th: "หาคอร์ทพิคเคิลบอลใกล้ฉันและกลุ่มพิคเคิลบอลที่จับคู่ได้ทันที",
      en: "Find pickleball courts near me and running groups across Thailand.",
    },
    courts: {
      th: "หาคอร์ทพิคเคิลบอลใกล้ฉัน",
      en: "Find pickleball courts near me",
    },
    groups: {
      th: "หาก๊วนพิคเคิลบอล",
      en: "Find pickleball meetup groups near me",
    },
  },
  tennis: {
    hero: {
      th: "หาคอร์ทเทนนิสใกล้ฉันและก๊วนตีเทนนิสที่เปิดรับผู้เล่นใหม่",
      en: "Find tennis courts near me and tennis groups that welcome new players.",
    },
    courts: {
      th: "หาคอร์ทเทนนิสใกล้ฉัน",
      en: "Find tennis courts near me",
    },
    groups: {
      th: "หาก๊วนตีเทนนิส",
      en: "Find tennis groups near me",
    },
  },
  tabletennis: {
    hero: {
      th: "หาสนามปิงปองใกล้ฉันและกลุ่มซ้อมที่เปิดให้ลองเล่น",
      en: "Find table tennis clubs near me and open practice groups.",
    },
    courts: {
      th: "หาสนามปิงปองใกล้ฉัน",
      en: "Find table tennis clubs near me",
    },
    groups: {
      th: "หาก๊วนปิงปอง",
      en: "Find table tennis groups near me",
    },
  },
};

export function getSeoKeyword(
  sportCode: string,
  locale: Locale,
  type: KeywordType,
): string {
  const entry = KEYWORDS[sportCode.toLowerCase()];
  if (!entry) return "";
  return entry[type]?.[locale] ?? "";
}
