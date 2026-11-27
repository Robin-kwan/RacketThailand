import type { Locale } from "@/lib/i18n";

type LocalizedDiscoveryCopy = Record<
  Locale,
  {
    sportTitle: string;
    sportDescription: string;
    courtFinderTitle: string;
    courtFinderDescription: string;
    courtFinderLinkLabel: string;
    groupFinderTitle: string;
    groupFinderDescription: string;
    groupFinderLinkLabel: string;
  }
>;

const SPORT_DISCOVERY_COPY: Record<string, LocalizedDiscoveryCopy> = {
  badminton: {
    th: {
      sportTitle: "แบดมินตัน | RacketThailand",
      sportDescription:
        "ค้นหาสนาม ดูกลุ่มที่เปิดรับสมาชิก และเจอเพื่อนเล่นแบด พร้อมวันเวลา สถานที่ และช่องทางติดต่อ",
      courtFinderTitle: "สนามแบดใกล้คุณ | RacketThailand",
      courtFinderDescription:
        "ค้นหาสนามแบดใกล้คุณจากแผนที่ ดูที่ตั้ง รูปภาพ และช่องทางติดต่อก่อนเดินทางหรือจองสนาม",
      courtFinderLinkLabel: "ค้นหาสนามแบด",
      groupFinderTitle: "หาก๊วนตีแบด | RacketThailand",
      groupFinderDescription:
        "ดูก๊วนตีแบดที่เปิดรับสมาชิก พร้อมสนาม วันเวลา รูปแบบการเล่น และช่องทางติดต่อผู้จัดก๊วน",
      groupFinderLinkLabel: "ดูกลุ่มที่เปิดรับ",
    },
    en: {
      sportTitle: "Badminton in Thailand | RacketThailand",
      sportDescription:
        "Find badminton courts, groups accepting players, and people to play with across Thailand, including schedules, venues, and contact details.",
      courtFinderTitle: "Badminton courts near you | RacketThailand",
      courtFinderDescription:
        "Find badminton courts across Thailand on the map, with locations, photos, and contact details for planning or booking.",
      courtFinderLinkLabel: "Find badminton courts",
      groupFinderTitle: "Find badminton groups in Thailand | RacketThailand",
      groupFinderDescription:
        "Browse badminton groups accepting players, with regular venues, schedules, play formats, and organizer contact details.",
      groupFinderLinkLabel: "Browse badminton groups",
    },
  },
  padel: {
    th: {
      sportTitle: "สนามพาเดลและกลุ่มเล่นพาเดล | RacketThailand",
      sportDescription:
        "ค้นหาสนามพาเดล กลุ่มที่เปิดรับผู้เล่น และเพื่อนเล่น พร้อมวันเวลา สถานที่ และช่องทางติดต่อ",
      courtFinderTitle: "สนามพาเดลใกล้คุณ | RacketThailand",
      courtFinderDescription:
        "ค้นหาสนามพาเดลใกล้คุณจากแผนที่ ดูที่ตั้ง รูปภาพ และช่องทางติดต่อก่อนเดินทางหรือจองสนาม",
      courtFinderLinkLabel: "ค้นหาสนามพาเดล",
      groupFinderTitle: "หากลุ่มเล่นพาเดล | RacketThailand",
      groupFinderDescription:
        "ดูกลุ่มเล่นพาเดลที่เปิดรับผู้เล่น พร้อมสนาม วันเวลา รูปแบบการเล่น และช่องทางติดต่อผู้จัดกลุ่ม",
      groupFinderLinkLabel: "หากลุ่มเล่นพาเดล",
    },
    en: {
      sportTitle: "Padel courts and groups in Thailand | RacketThailand",
      sportDescription:
        "Find padel courts, groups accepting players, and people to play with across Thailand, including schedules, venues, and contact details.",
      courtFinderTitle: "Padel courts near you | RacketThailand",
      courtFinderDescription:
        "Find padel courts across Thailand on the map, with locations, photos, and contact details for planning or booking.",
      courtFinderLinkLabel: "Find padel courts",
      groupFinderTitle: "Find padel groups in Thailand | RacketThailand",
      groupFinderDescription:
        "Browse padel groups accepting players, with regular venues, schedules, play formats, and organizer contact details.",
      groupFinderLinkLabel: "Find a padel group",
    },
  },
  pickleball: {
    th: {
      sportTitle: "สนามพิคเคิลบอลและกลุ่มเล่นพิคเคิลบอล | RacketThailand",
      sportDescription:
        "ค้นหาสนามพิคเคิลบอล กลุ่มที่เปิดรับผู้เล่น และเพื่อนเล่น พร้อมวันเวลา สถานที่ และช่องทางติดต่อ",
      courtFinderTitle: "สนามพิคเคิลบอลใกล้คุณ | RacketThailand",
      courtFinderDescription:
        "ค้นหาสนามพิคเคิลบอลใกล้คุณจากแผนที่ ดูที่ตั้ง รูปภาพ และช่องทางติดต่อก่อนเดินทางหรือจองสนาม",
      courtFinderLinkLabel: "ค้นหาสนามพิคเคิลบอล",
      groupFinderTitle: "หากลุ่มเล่นพิคเคิลบอล | RacketThailand",
      groupFinderDescription:
        "ดูกลุ่มเล่นพิคเคิลบอลที่เปิดรับผู้เล่น พร้อมสนาม วันเวลา รูปแบบการเล่น และช่องทางติดต่อผู้จัดกลุ่ม",
      groupFinderLinkLabel: "หากลุ่มเล่นพิคเคิลบอล",
    },
    en: {
      sportTitle: "Pickleball courts and groups in Thailand | RacketThailand",
      sportDescription:
        "Find pickleball courts, groups accepting players, and people to play with across Thailand, including schedules, venues, and contact details.",
      courtFinderTitle: "Pickleball courts near you | RacketThailand",
      courtFinderDescription:
        "Find pickleball courts across Thailand on the map, with locations, photos, and contact details for planning or booking.",
      courtFinderLinkLabel: "Find pickleball courts",
      groupFinderTitle: "Find pickleball groups in Thailand | RacketThailand",
      groupFinderDescription:
        "Browse pickleball groups accepting players, with regular venues, schedules, play formats, and organizer contact details.",
      groupFinderLinkLabel: "Find a pickleball group",
    },
  },
  tennis: {
    th: {
      sportTitle: "สนามเทนนิสและกลุ่มตีเทนนิส | RacketThailand",
      sportDescription:
        "ค้นหาสนามเทนนิส กลุ่มที่เปิดรับผู้เล่น และเพื่อนตีเทนนิส พร้อมวันเวลา สถานที่ และช่องทางติดต่อ",
      courtFinderTitle: "สนามเทนนิสใกล้คุณ | RacketThailand",
      courtFinderDescription:
        "ค้นหาสนามเทนนิสใกล้คุณจากแผนที่ ดูที่ตั้ง รูปภาพ และช่องทางติดต่อก่อนเดินทางหรือจองสนาม",
      courtFinderLinkLabel: "ค้นหาสนามเทนนิส",
      groupFinderTitle: "หากลุ่มตีเทนนิส | RacketThailand",
      groupFinderDescription:
        "ดูกลุ่มตีเทนนิสที่เปิดรับผู้เล่น พร้อมสนาม วันเวลา รูปแบบการเล่น และช่องทางติดต่อผู้จัดกลุ่ม",
      groupFinderLinkLabel: "หากลุ่มตีเทนนิส",
    },
    en: {
      sportTitle: "Tennis courts and groups in Thailand | RacketThailand",
      sportDescription:
        "Find tennis courts, groups accepting players, and people to play with across Thailand, including schedules, venues, and contact details.",
      courtFinderTitle: "Tennis courts near you | RacketThailand",
      courtFinderDescription:
        "Find tennis courts across Thailand on the map, with locations, photos, and contact details for planning or booking.",
      courtFinderLinkLabel: "Find tennis courts",
      groupFinderTitle: "Find tennis groups in Thailand | RacketThailand",
      groupFinderDescription:
        "Browse tennis groups accepting players, with regular venues, schedules, play formats, and organizer contact details.",
      groupFinderLinkLabel: "Find a tennis group",
    },
  },
  tabletennis: {
    th: {
      sportTitle: "สนามปิงปองและกลุ่มตีปิงปอง | RacketThailand",
      sportDescription:
        "ค้นหาสนามปิงปอง กลุ่มที่เปิดรับผู้เล่น และเพื่อนตีปิงปอง พร้อมวันเวลา สถานที่ และช่องทางติดต่อ",
      courtFinderTitle: "สนามปิงปองใกล้คุณ | RacketThailand",
      courtFinderDescription:
        "ค้นหาสนามปิงปองใกล้คุณจากแผนที่ ดูที่ตั้ง รูปภาพ และช่องทางติดต่อก่อนเดินทางหรือจองสนาม",
      courtFinderLinkLabel: "ค้นหาสนามปิงปอง",
      groupFinderTitle: "หากลุ่มตีปิงปอง | RacketThailand",
      groupFinderDescription:
        "ดูกลุ่มตีปิงปองที่เปิดรับผู้เล่น พร้อมสนาม วันเวลา รูปแบบการเล่น และช่องทางติดต่อผู้จัดกลุ่ม",
      groupFinderLinkLabel: "หากลุ่มตีปิงปอง",
    },
    en: {
      sportTitle: "Table tennis clubs and groups in Thailand | RacketThailand",
      sportDescription:
        "Find table tennis clubs, groups accepting players, and people to play with across Thailand, including schedules, venues, and contact details.",
      courtFinderTitle: "Table tennis clubs near you | RacketThailand",
      courtFinderDescription:
        "Find table tennis clubs across Thailand on the map, with locations, photos, and contact details for planning a visit.",
      courtFinderLinkLabel: "Find table tennis clubs",
      groupFinderTitle: "Find table tennis groups in Thailand | RacketThailand",
      groupFinderDescription:
        "Browse table tennis groups accepting players, with regular venues, schedules, play formats, and organizer contact details.",
      groupFinderLinkLabel: "Find a table tennis group",
    },
  },
};

export function getSportDiscoveryCopy(sportCode: string, locale: Locale) {
  return SPORT_DISCOVERY_COPY[sportCode]?.[locale] ?? null;
}
