import type { Locale } from "@/lib/i18n";
import type { LandingSport } from "@/types/sports";

type LocalizedString = Record<Locale, string>;
type LocalizedList = Record<Locale, string[]>;

const l = (th: string, en: string): LocalizedString => ({ th, en });
const list = (th: string[], en: string[]): LocalizedList => ({ th, en });

type SportMeta = {
  code: string;
  name: LocalizedString;
  accent: string;
  gradient: string;
  coverImage: string;
  heroHeadline: LocalizedString;
  heroDescription: LocalizedString;
  closingTitle: LocalizedString;
  closingDetail: LocalizedString;
  closingActions: { label: LocalizedString; href: string }[];
  landingDescription: LocalizedString;
  landingHighlights: LocalizedList;
};

export const SPORT_META: Record<string, SportMeta> = {
  badminton: {
    code: "badminton",
    name: l("แบดมินตัน", "Badminton"),
    accent: "#0f766e",
    gradient: "from-rose-500/30 via-orange-500/20 to-amber-500/10",
    coverImage: "/sports/badminton.png",
    heroHeadline: l("สนามและก๊วนตีแบดในที่เดียว", "Badminton courts & groups in one place."),
    heroDescription: l(
      "ค้นหาสนามแบดมินตัน ดูก๊วนตีแบดที่เปิดรับสมาชิก หาเพื่อนตีแบด และช่องทางติดต่อ",
      "Explore verified venues, check active groups, and contact organizers directly from the same portal.",
    ),
    closingTitle: l("มีสนามหรือก๊วนตีแบดใหม่?", "Have new badminton courts or groups?"),
    closingDetail: l(
      "ส่งรายละเอียดให้ทีมงาน เพื่อให้ชุมชนหาเจอได้ง่ายขึ้น",
      "Send us the details so the community can find them faster.",
    ),
    closingActions: [
      { label: l("ส่งข้อมูล", "Submit info"), href: "mailto:hello@racketthailand.com" },
      { label: l("ดูสนามแบด", "Browse courts"), href: "/badminton/court-finder" },
    ],
    landingDescription: l(
      "ดูสนามที่ยืนยันแล้วและก๊วนตีแบดทั่วไทย พร้อมช่องทางติดต่อแอดมิน",
      "Browse verified badminton courts, weekly groups, and organizer contacts across Thailand.",
    ),
    landingHighlights: list(["แผนที่สนาม", "กลุ่มประจำ", "ส่งข้อมูลใหม่"], [
      "Court finder",
      "Weekly groups",
      "Submit updates",
    ]),
  },
  padel: {
    code: "padel",
    name: l("พาเดล", "Padel"),
    accent: "#b45309",
    gradient: "from-orange-500/30 via-amber-500/20 to-rose-500/10",
    coverImage: "/sports/padel.png",
    heroHeadline: l("สนามและกลุ่มพาเดลในที่เดียว", "Padel courts & groups in one place."),
    heroDescription: l(
      "ใช้แผนที่สนามและระบบค้นหากลุ่มเพื่อวางแผนแมตช์ดับเบิลครั้งต่อไปของคุณ",
      "Use the live court finder and group finder to plan your next doubles session.",
    ),
    closingTitle: l("มีสนามหรือกลุ่มพาเดลใหม่?", "Have new padel courts or groups?"),
    closingDetail: l(
      "บอกทีมงานได้เลย เพื่อให้ผู้เล่นทั่วไทยหาเจอได้ง่ายขึ้น",
      "Let us know so every padel player can discover them quickly.",
    ),
    closingActions: [
      { label: l("ส่งข้อมูล", "Submit info"), href: "mailto:hello@racketthailand.com" },
      { label: l("ดูสนามพาเดล", "Browse courts"), href: "/padel/court-finder" },
    ],
    landingDescription: l(
      "ค้นหาสนามและกลุ่มพาเดลที่เปิดรอคุณอยู่ในกรุงเทพฯ และต่างจังหวัด",
      "Explore the padel courts and community groups that are already running across Thailand.",
    ),
    landingHighlights: list(["แผนที่สนาม", "กลุ่มประจำ", "ส่งข้อมูลใหม่"], [
      "Court finder",
      "Weekly groups",
      "Submit updates",
    ]),
  },
  pickleball: {
    code: "pickleball",
    name: l("พิคเคิลบอล", "Pickleball"),
    accent: "#0d9488",
    gradient: "from-lime-400/30 via-emerald-400/20 to-yellow-300/10",
    coverImage: "/sports/pickleball.png",
    heroHeadline: l("สนามและกลุ่มพิคเคิลบอลในที่เดียว", "Pickleball courts & groups in one place."),
    heroDescription: l(
      "ค้นหาสนามยืนยันแล้วและกลุ่มที่เปิดรับผู้เล่นใหม่ พร้อมช่องทางติดต่อแอดมิน",
      "Find verified venues and active groups with organizer contacts in seconds.",
    ),
    closingTitle: l("มีสนามหรือกลุ่มพิคเคิลบอลใหม่?", "Have new pickleball courts or groups?"),
    closingDetail: l(
      "ส่งข้อมูลให้เราเพิ่มเข้าแผนที่เพื่อช่วยให้คนหาเจอได้ง่ายขึ้น",
      "Send them our way so we can add them to the live map.",
    ),
    closingActions: [
      { label: l("ส่งข้อมูล", "Submit info"), href: "mailto:hello@racketthailand.com" },
      { label: l("ดูสนามพิคเคิลบอล", "Browse courts"), href: "/pickleball/court-finder" },
    ],
    landingDescription: l(
      "ดูสนามและกลุ่มพิคเคิลบอลที่มีอยู่จริง พร้อมช่องทางติดต่อ",
      "Browse real pickleball courts and weekly groups with contact info.",
    ),
    landingHighlights: list(["แผนที่สนาม", "กลุ่มประจำ", "ส่งข้อมูลใหม่"], [
      "Court finder",
      "Weekly groups",
      "Submit updates",
    ]),
  },
  tennis: {
    code: "tennis",
    name: l("เทนนิส", "Tennis"),
    accent: "#65a30d",
    gradient: "from-emerald-500/30 via-lime-400/20 to-amber-300/10",
    coverImage: "/sports/tennis.png",
    heroHeadline: l("สนามและกลุ่มเทนนิสในที่เดียว", "Tennis courts & groups in one place."),
    heroDescription: l(
      "ค้นหาสนามมาตรฐานและกลุ่มตีประจำ พร้อมช่องทางติดต่อผู้ดูแลเพื่อจองหรือขอร่วมเล่น",
      "Find verified courts and weekly hitting groups with organizer contacts ready to go.",
    ),
    closingTitle: l("มีสนามหรือกลุ่มเทนนิสใหม่?", "Have new tennis courts or groups?"),
    closingDetail: l(
      "แจ้งทีมงานเพื่อช่วยอัปเดตให้ทุกคนหาเจอได้ง่ายขึ้น",
      "Let us know so we can update the portal for everyone.",
    ),
    closingActions: [
      { label: l("ส่งข้อมูล", "Submit info"), href: "mailto:hello@racketthailand.com" },
      { label: l("ดูสนามเทนนิส", "Browse courts"), href: "/tennis/court-finder" },
    ],
    landingDescription: l(
      "ดูสนามเทนนิสและกลุ่มตีประจำ พร้อมช่องทางติดต่อ",
      "Browse tennis courts and weekly groups with organizer contacts.",
    ),
    landingHighlights: list(["แผนที่สนาม", "กลุ่มประจำ", "ส่งข้อมูลใหม่"], [
      "Court finder",
      "Weekly groups",
      "Submit updates",
    ]),
  },
  tabletennis: {
    code: "tabletennis",
    name: l("ปิงปอง", "Table Tennis"),
    accent: "#be185d",
    gradient: "from-purple-500/30 via-fuchsia-400/20 to-pink-400/10",
    coverImage: "/sports/tabletennis.png",
    heroHeadline: l("สนามปิงปองและกลุ่มซ้อมในที่เดียว", "Table tennis clubs & groups in one place."),
    heroDescription: l(
      "ค้นหาสนาม ดูตารางกลุ่มซ้อม และติดต่อผู้จัดได้ทันที",
      "Browse verified clubs, weekly sessions, and organizer contacts in seconds.",
    ),
    closingTitle: l("มีสนามหรือกลุ่มปิงปองใหม่?", "Have new table tennis clubs or groups?"),
    closingDetail: l(
      "ส่งข้อมูลให้เราเพื่อช่วยให้ผู้เล่นทั่วประเทศค้นหาได้ง่ายขึ้น",
      "Send us the details so every player can discover them faster.",
    ),
    closingActions: [
      { label: l("ส่งข้อมูล", "Submit info"), href: "mailto:hello@racketthailand.com" },
      { label: l("ดูสนามปิงปอง", "Browse clubs"), href: "/tabletennis/court-finder" },
    ],
    landingDescription: l(
      "ดูสนามและกลุ่มปิงปองที่เปิดรับสมาชิก พร้อมช่องทางติดต่อแอดมิน",
      "Browse table tennis clubs and groups with direct contact info.",
    ),
    landingHighlights: list(["แผนที่สนาม", "กลุ่มประจำ", "ส่งข้อมูลใหม่"], [
      "Club finder",
      "Weekly groups",
      "Submit updates",
    ]),
  },
};

type FeatureDescriptor = {
  label: LocalizedString;
  table: string;
  description: LocalizedString;
};

const FEATURE_DESCRIPTIONS: Record<string, FeatureDescriptor> = {
  courts: {
    label: l("ระบบค้นหาสนาม", "Court Finder"),
    table: "`courts` + `court_photos`",
    description: l(
      "ข้อมูลสนามแบบมีพิกัด ราคา และรูปภาพ เพื่อให้ผู้เล่นกรองตามจังหวัด/เขตได้ทันที",
      "Unified venue data with geo, pricing, and media so sport seekers can filter by district instantly.",
    ),
  },
  groups: {
    label: l("ค้นหากลุ่ม/พาร์ทเนอร์", "Group Finder"),
    table: "`groups`",
    description: l(
      "ค้นหากลุ่มพร้อมบทบาทเจ้าของ ระบบยืนยัน และตัวกรองระดับฝีมือ",
      "Community discovery with owner/admin roles, verification, and skill filters.",
    ),
  },
  community: {
    label: l("กระดานคอมมูนิตี้", "Community Board"),
    table: "`posts` + `comments`",
    description: l(
      "โพสต์คำถาม ข่าว และรีวิวที่ผูกกับกีฬา/กลุ่ม พร้อมระบบคอมเมนต์ภายใต้บัญชีเดียว",
      "Discussions, news, and reviews moderated by shared Supabase Auth sessions.",
    ),
  },
  profiles: {
    label: l("โปรไฟล์หลายกีฬา", "Multi-sport Profiles"),
    table: "`profiles` + `profile_sports`",
    description: l(
      "บัญชีเดียวสำหรับทุกกีฬา เก็บระดับฝีมือและความชอบต่อกีฬาแต่ละประเภท",
      "One identity across all subdomains with per-sport skills and preferences.",
    ),
  },
  feedback: {
    label: l("ศูนย์แจ้งปัญหา/ข้อเสนอแนะ", "Feedback & Reports"),
    table: "`feedback`",
    description: l(
      "ระบบทิกเก็ตสำหรับแจ้งบั๊ก ฟีดแบ็ก หรือรายงานผู้ใช้ ให้แอดมินติดตามสถานะได้",
      "Trust desk pipeline for bugs, feature ideas, and community safety reports.",
    ),
  },
};

export type SportMetaCode = keyof typeof SPORT_META;
export const SUPPORTED_SPORTS = Object.keys(SPORT_META) as SportMetaCode[];

export function getSportMeta(code: string) {
  return SPORT_META[code.toLowerCase()];
}

export const LANDING_SPORTS: LandingSport[] = Object.values(SPORT_META).map(
  ({ code, name, accent, landingDescription, landingHighlights, coverImage }) => ({
    code,
    name,
    color: accent,
    coverImage,
    description: landingDescription,
    highlights: landingHighlights,
  }),
);

export { FEATURE_DESCRIPTIONS };
