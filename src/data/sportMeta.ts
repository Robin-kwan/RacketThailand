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
    accent: "#FF4D6D",
    gradient: "from-rose-500/30 via-orange-500/20 to-amber-500/10",
    coverImage: "/sports/badminton.svg",
    heroHeadline: l("ฮับของคนรักแบดในประเทศไทย", "Feather-focused hub for Thai shuttlers."),
    heroDescription: l(
      "ค้นหาคอร์ทควบคุมความชื้น เข้าร่วมลำดับ Sukhumvit และเก็บสถิติทุกแมตช์บนระบบเดียว",
      "Find climate-controlled courts, tap into Sukhumvit ladder groups, and track every rally with Supabase-backed stats.",
    ),
    closingTitle: l("พร้อมขยายคอมมูนิตี้แบดไทยหรือยัง?", "Ready to grow Thailand’s badminton scene?"),
    closingDetail: l(
      "เริ่มจาก badminton.racketthailand.com แล้วส่งคอร์ท กลุ่ม และการแข่งขันใหม่ ๆ ได้ทันที",
      "Start from badminton.racketthailand.com to share courts, groups, and ladder matches instantly.",
    ),
    closingActions: [
      { label: l("ส่งข้อมูลคอร์ท", "Submit a court"), href: "mailto:hello@racketthailand.com" },
      { label: l("ดูตารางลำดับ", "View ladders"), href: "/badminton#matches" },
    ],
    landingDescription: l(
      "รวมคอร์ท กลุ่ม และแรงก์สำหรับสายแบดทั้งกรุงเทพฯ และเชียงใหม่",
      "Club guides, drop-in schedules, and rankings for both Bangkok speedsters and Chiang Mai grinders.",
    ),
    landingHighlights: list(["ค้นหาคอร์ท", "ลำดับกลางคืน", "บทความเทคนิค"], [
      "Court finder",
      "Night ladders",
      "Pro tips",
    ]),
  },
  padel: {
    code: "padel",
    name: l("พาเดล", "Padel"),
    accent: "#FF9F1C",
    gradient: "from-orange-500/30 via-amber-500/20 to-rose-500/10",
    coverImage: "/sports/padel.svg",
    heroHeadline: l("ติดตามเครือข่ายพาเดลที่เติบโตเร็วที่สุดในไทย", "Track Thailand’s fastest-growing padel network."),
    heroDescription: l(
      "รวมคอร์ทพรีเมียม ลีกสุดสัปดาห์ และคอนเทนต์ไฮไลต์ที่คัดแล้วสำหรับผู้เล่นคู่นี้",
      "Premium courts, membership clubs, and curated weekend socials designed for doubles fans.",
    ),
    closingTitle: l("ช่วยให้พาเดลบูมทั่วประเทศ", "Help padel thrive across Thailand."),
    closingDetail: l(
      "นำทุกลีก งานอีเวนต์ และคอร์ทเข้าสู่ padel.racketthailand.com เพื่อให้ผู้เล่นเจอกันง่ายขึ้น",
      "Bring every league, mixer, and court into padel.racketthailand.com so players can find each other faster.",
    ),
    closingActions: [
      { label: l("จัดงานพาเดล", "Host a padel event"), href: "/padel#groups" },
      { label: l("ติดต่อพาร์ทเนอร์", "Contact partnerships"), href: "mailto:hello@racketthailand.com" },
    ],
    landingDescription: l(
      "ติดตามคอร์ทพรีเมียม ดับเบิลโซเชียล และคอนเทนต์คัดสรรของพาเดลไทย",
      "Track the fast-growing padel scene with premium venues, social doubles, and curated community drops.",
    ),
    landingHighlights: list(["รีวิวคอร์ท", "มีทอัปสุดสัปดาห์", "สปอนเซอร์อุปกรณ์"], [
      "Venue spotlights",
      "Weekend mixers",
      "Equipment partners",
    ]),
  },
  pickleball: {
    code: "pickleball",
    name: l("พิคเคิลบอล", "Pickleball"),
    accent: "#2EC4B6",
    gradient: "from-emerald-400/30 via-teal-400/20 to-cyan-500/10",
    coverImage: "/sports/pickleball.svg",
    heroHeadline: l("ฐานข้อมูลพิคเคิลบอลที่เดินทางได้ทุกจังหวัด", "Travel-friendly pickleball finder."),
    heroDescription: l(
      "รวบรวมคอร์ทชั่วคราว กลุ่มนักท่องเที่ยวกีฬา และคอร์สคลินิกตั้งแต่ภูเก็ตถึงเชียงใหม่",
      "Locate pop-up courts, traveling crews, and clinics from Phuket to Chiang Mai.",
    ),
    closingTitle: l("ให้ผู้เล่นพิคเคิลบอลเดินทางได้ง่ายขึ้น", "Keep pickleball explorers synced."),
    closingDetail: l(
      "แชร์คอร์ทใหม่หรือเข้าร่วมกลุ่มเดินทางผ่าน pickleball.racketthailand.com ในระบบเดียว",
      "Share travel courts or join nomad crews through pickleball.racketthailand.com with one login.",
    ),
    closingActions: [
      { label: l("แชร์คอร์ทท่องเที่ยว", "Share a travel court"), href: "mailto:hello@racketthailand.com" },
      { label: l("เข้ากลุ่มภูเก็ต", "Join Phuket crews"), href: "/pickleball#groups" },
    ],
    landingDescription: l(
      "เชื่อมผู้เล่นที่เดินทางไปทั่วไทย ค้นหาคอร์ทและจัดสกิลแมตช์อัตโนมัติ",
      "Connect with traveling players, reserve courts, and build beginner-to-pro ladders across Thailand.",
    ),
    landingHighlights: list(["จับคู่ฝีมือ", "แจ้งเวลาคอร์ท", "ปฏิทินคลินิก"], [
      "Skill-matched groups",
      "Court availability",
      "Clinic calendar",
    ]),
  },
  tennis: {
    code: "tennis",
    name: l("เทนนิส", "Tennis"),
    accent: "#5C7CFA",
    gradient: "from-indigo-500/30 via-blue-500/20 to-sky-400/10",
    coverImage: "/sports/tennis.svg",
    heroHeadline: l("ระบบเดียวที่ดูแลลีกเทนนิสทั้งประเทศ", "League-grade tennis infrastructure."),
    heroDescription: l(
      "จัดลีก ดูสถิติ และเชื่อมต่อผู้เล่นกับโค้ชในแพลตฟอร์มเดียว ใช้ข้อมูล Supabase เป็นศูนย์กลาง",
      "Run tournaments, monitor ladder stats, and match players to coaches in a single Supabase stack.",
    ),
    closingTitle: l("ขับเคลื่อนเทนนิสไทยด้วยข้อมูลเดียวกัน", "Power Thai tennis with shared data."),
    closingDetail: l(
      "ให้สโมสร ลีก และเยาวชนใช้ระบบเดียวโดยไม่ต้องแยกบัญชีหลายที่",
      "Give clubs, leagues, and juniors a consistent system without fragmenting logins.",
    ),
    closingActions: [
      { label: l("เผยแพร่ลีก", "Publish a league"), href: "/tennis#matches" },
      { label: l("ติดต่อฝ่ายโค้ช", "Reach coach support"), href: "mailto:hello@racketthailand.com" },
    ],
    landingDescription: l(
      "จัดลีก ค้นหาโค้ช และดูคะแนนสดบนระบบเดียวสำหรับเทนนิสไทย",
      "Organize league seasons, scout coaches, and stay in sync with tournament-ready scoreboards.",
    ),
    landingHighlights: list(["ติดตามลีก", "ตลาดโค้ช", "สถิติแมตช์"], [
      "League tracking",
      "Coach marketplace",
      "Match analytics",
    ]),
  },
  tabletennis: {
    code: "tabletennis",
    name: l("ปิงปอง", "Table Tennis"),
    accent: "#9B5DE5",
    gradient: "from-purple-500/30 via-fuchsia-400/20 to-pink-400/10",
    coverImage: "/sports/tabletennis.svg",
    heroHeadline: l("พื้นที่ออนไลน์ของคนรักปิงปองไทย", "Spin-first experience for Thai pongers."),
    heroDescription: l(
      "อัปเดตคลับ โครงการเยาวชน และแมตช์ไฮไลต์จากพัทยาถึงภูเก็ต",
      "Highlight clubs, youth academies, reviews, and match archives dedicated to table tennis.",
    ),
    closingTitle: l("ผลักดันศักยภาพนักปิงปองไทย", "Champion Thailand’s table tennis talent."),
    closingDetail: l(
      "สร้างพื้นที่ให้โค้ช เยาวชน และผู้เล่นสันทนาการแชร์ข้อมูลชุดเดียวกัน",
      "Give coaches, juniors, and weekend warriors a cohesive space dedicated to spin.",
    ),
    closingActions: [
      { label: l("ส่งข้อมูลอะคาเดมี", "Submit a youth academy"), href: "mailto:hello@racketthailand.com" },
      { label: l("ดูคลังแมตช์", "Browse match archives"), href: "/tabletennis#matches" },
    ],
    landingDescription: l(
      "คอมมูนิตี้ของคลับ เยาวชน และรีวิวปิงปองทั่วประเทศ",
      "Spin-focused hubs for clubs, youth academies, and rating-backed matches from Pattaya to Phuket.",
    ),
    landingHighlights: list(["รีวิวคลับ", "โครงการเยาวชน", "ชมไฮไลต์"], [
      "Club reviews",
      "Youth programs",
      "Match replays",
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
    label: l("ระบบค้นหาคอร์ท", "Court Finder"),
    table: "`courts` + `court_photos`",
    description: l(
      "ข้อมูลคอร์ทแบบมีพิกัด ราคา และรูปภาพ เพื่อให้ผู้เล่นกรองตามจังหวัด/เขตได้ทันที",
      "Unified venue data with geo, pricing, and media so sport seekers can filter by district instantly.",
    ),
  },
  groups: {
    label: l("ค้นหากลุ่ม/พาร์ทเนอร์", "Group Finder"),
    table: "`groups` + `group_members`",
    description: l(
      "ค้นหากลุ่มแบบสาธารณะ/ส่วนตัว พร้อมระดับฝีมือและบทบาทเจ้าของกลุ่ม",
      "Community discovery with owner/admin roles, visibility toggles, and skill filters.",
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
  matches: {
    label: l("แมตช์ & สกอร์บอร์ด", "Matches & Scoreboard"),
    table: "`matches` + `match_participants` + `match_games`",
    description: l(
      "สร้างแมตช์ กำหนดทีม และบันทึกสกอร์รายเกม พร้อมเชื่อมโยงคอร์ท/กลุ่ม",
      "Team assignments, score-by-score tracking, and lifecycle statuses tied to each sport.",
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
