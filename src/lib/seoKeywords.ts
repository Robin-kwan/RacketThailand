import type { Locale } from "@/lib/i18n";

type KeywordType = "hero" | "courts" | "groups";

type KeywordEntry = Partial<Record<KeywordType, Record<Locale, string>>>;

const KEYWORDS: Record<string, KeywordEntry> = {
  badminton: {
    hero: {
      th: "ก๊วนแบด หาก๊วนตีแบด ค้นหาสนามแบดมินตันใกล้ฉัน คอร์ทแบดใกล้ฉัน หาเพื่อนตีแบด และช่องทางติดต่อเพื่อสอบถามการจองสนาม",
      en: "Find badminton courts near me, find badminton partners, and join local badminton groups in minutes.",
    },
    courts: {
      th: "สนามแบดมินตันใกล้ฉัน คอร์ทแบดใกล้ฉัน และช่องทางติดต่อเพื่อสอบถามการจองสนาม",
      en: "Find badminton courts near me",
    },
    groups: {
      th: "ก๊วนแบด หาก๊วนตีแบด ก๊วนตีแบดใกล้ฉัน หาเพื่อนตีแบด และกลุ่มแบดมินตันที่เปิดรับสมาชิก",
      en: "Find badminton groups near me and find badminton partners",
    },
  },
  padel: {
    hero: {
      th: "ค้นหาสนามพาเดล คอร์ทพาเดลใกล้ฉัน หากลุ่มเล่นพาเดล กลุ่มพาเดล หาเพื่อนเล่นพาเดล และข้อมูลสำหรับคนที่อยากรู้ว่าพาเดลคืออะไร",
      en: "Find padel courts near me, find padel partners, and join doubles groups that are accepting new players.",
    },
    courts: {
      th: "สนามพาเดล คอร์ทพาเดลใกล้ฉัน และ padel bangkok สำหรับผู้เล่นในไทย",
      en: "Find padel courts near me",
    },
    groups: {
      th: "หากลุ่มเล่นพาเดล กลุ่มพาเดล ก๊วนพาเดล หาเพื่อนเล่นพาเดล และคู่เล่นพาเดลที่เปิดรับสมาชิก",
      en: "Find padel groups near me and find padel partners",
    },
  },
  pickleball: {
    hero: {
      th: "ค้นหาสนามพิคเคิลบอลใกล้ฉัน หากลุ่มเล่นพิคเคิลบอล กลุ่มพิคเคิลบอล open play หาเพื่อนเล่นพิคเคิลบอล และข้อมูลสำหรับคนที่อยากรู้ว่าพิคเคิลบอลคืออะไร",
      en: "Find pickleball courts near me, find pickleball partners, and join open play groups across Thailand.",
    },
    courts: {
      th: "สนามพิคเคิลบอลใกล้ฉัน pickleball bangkok และช่องทางติดต่อสนามพิคเคิลบอล",
      en: "Find pickleball courts near me",
    },
    groups: {
      th: "หากลุ่มเล่นพิคเคิลบอล กลุ่มพิคเคิลบอล ก๊วนพิคเคิลบอล หาเพื่อนเล่นพิคเคิลบอล และ pickleball open play ที่เปิดรับผู้เล่นใหม่",
      en: "Find pickleball groups near me and find pickleball partners",
    },
  },
  tennis: {
    hero: {
      th: "ค้นหาสนามเทนนิสใกล้ฉัน คอร์ทเทนนิส หากลุ่มตีเทนนิส กลุ่มตีเทนนิส หาเพื่อนตีเทนนิส และช่องทางติดต่อสนาม",
      en: "Find tennis courts near me, find tennis partners, and join tennis groups that welcome new players.",
    },
    courts: {
      th: "สนามเทนนิสใกล้ฉัน คอร์ทเทนนิส และช่องทางติดต่อเพื่อสอบถามการจองสนาม",
      en: "Find tennis courts near me",
    },
    groups: {
      th: "หากลุ่มตีเทนนิส กลุ่มตีเทนนิส หาเพื่อนตีเทนนิส และก๊วนเทนนิสที่เปิดรับผู้เล่นใหม่",
      en: "Find tennis groups near me and find tennis partners",
    },
  },
  tabletennis: {
    hero: {
      th: "ค้นหาสนามปิงปองใกล้ฉัน เทเบิลเทนนิส หากลุ่มตีปิงปอง กลุ่มซ้อมปิงปอง และหาเพื่อนตีปิงปอง",
      en: "Find table tennis clubs near me, find table tennis partners, and join open practice groups.",
    },
    courts: {
      th: "สนามปิงปองใกล้ฉัน สนามเทเบิลเทนนิส และ table tennis club bangkok",
      en: "Find table tennis clubs near me",
    },
    groups: {
      th: "หากลุ่มตีปิงปอง กลุ่มซ้อมปิงปอง หาเพื่อนตีปิงปอง และกลุ่มเทเบิลเทนนิสที่เปิดรับสมาชิก",
      en: "Find table tennis groups near me and find table tennis partners",
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
