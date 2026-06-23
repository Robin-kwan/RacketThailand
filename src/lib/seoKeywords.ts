import type { Locale } from "@/lib/i18n";

type KeywordType = "hero" | "courts" | "groups";

type KeywordEntry = Partial<Record<KeywordType, Record<Locale, string>>>;

const KEYWORDS: Record<string, KeywordEntry> = {
  badminton: {
    hero: {
      th: "ค้นหาสนามแบดมินตันใกล้ฉัน คอร์ทแบดใกล้ฉัน ก๊วนแบด หาเพื่อนตีแบด และช่องทางติดต่อเพื่อสอบถามการจองสนาม",
      en: "Find badminton courts near me and local badminton groups in minutes.",
    },
    courts: {
      th: "สนามแบดมินตันใกล้ฉัน คอร์ทแบดใกล้ฉัน และช่องทางติดต่อเพื่อสอบถามการจองสนาม",
      en: "Find badminton courts near me",
    },
    groups: {
      th: "ก๊วนแบด หาเพื่อนตีแบด และกลุ่มแบดมินตันที่เปิดรับสมาชิก",
      en: "Join badminton meetup groups near me",
    },
  },
  padel: {
    hero: {
      th: "ค้นหาสนามพาเดล คอร์ทพาเดลใกล้ฉัน กลุ่มพาเดล และข้อมูลสำหรับคนที่อยากรู้ว่าพาเดลคืออะไร",
      en: "Find padel courts near me or doubles groups that are accepting new players.",
    },
    courts: {
      th: "สนามพาเดล คอร์ทพาเดลใกล้ฉัน และ padel bangkok สำหรับผู้เล่นในไทย",
      en: "Find padel courts near me",
    },
    groups: {
      th: "กลุ่มพาเดล ก๊วนพาเดล และคู่เล่นพาเดลที่เปิดรับสมาชิก",
      en: "Find padel groups near me",
    },
  },
  pickleball: {
    hero: {
      th: "ค้นหาสนามพิคเคิลบอลใกล้ฉัน กลุ่มพิคเคิลบอล open play และข้อมูลสำหรับคนที่อยากรู้ว่าพิคเคิลบอลคืออะไร",
      en: "Find pickleball courts near me and running groups across Thailand.",
    },
    courts: {
      th: "สนามพิคเคิลบอลใกล้ฉัน pickleball bangkok และช่องทางติดต่อสนามพิคเคิลบอล",
      en: "Find pickleball courts near me",
    },
    groups: {
      th: "กลุ่มพิคเคิลบอล ก๊วนพิคเคิลบอล และ pickleball open play ที่เปิดรับผู้เล่นใหม่",
      en: "Find pickleball meetup groups near me",
    },
  },
  tennis: {
    hero: {
      th: "ค้นหาสนามเทนนิสใกล้ฉัน คอร์ทเทนนิส กลุ่มตีเทนนิส หาเพื่อนตีเทนนิส และช่องทางติดต่อสนาม",
      en: "Find tennis courts near me and tennis groups that welcome new players.",
    },
    courts: {
      th: "สนามเทนนิสใกล้ฉัน คอร์ทเทนนิส และช่องทางติดต่อเพื่อสอบถามการจองสนาม",
      en: "Find tennis courts near me",
    },
    groups: {
      th: "กลุ่มตีเทนนิส หาเพื่อนตีเทนนิส และก๊วนเทนนิสที่เปิดรับผู้เล่นใหม่",
      en: "Find tennis groups near me",
    },
  },
  tabletennis: {
    hero: {
      th: "ค้นหาสนามปิงปองใกล้ฉัน เทเบิลเทนนิส กลุ่มซ้อมปิงปอง และหาเพื่อนตีปิงปอง",
      en: "Find table tennis clubs near me and open practice groups.",
    },
    courts: {
      th: "สนามปิงปองใกล้ฉัน สนามเทเบิลเทนนิส และ table tennis club bangkok",
      en: "Find table tennis clubs near me",
    },
    groups: {
      th: "กลุ่มซ้อมปิงปอง หาเพื่อนตีปิงปอง และกลุ่มเทเบิลเทนนิสที่เปิดรับสมาชิก",
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
