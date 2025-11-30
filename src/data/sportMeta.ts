type SportMeta = {
  code: string;
  name: string;
  nameTh: string;
  accent: string;
  gradient: string;
  heroHeadlineTh: string;
  heroHeadlineEn: string;
  heroDescriptionTh: string;
  heroDescriptionEn: string;
  closingTitleTh: string;
  closingTitleEn: string;
  closingDetailTh: string;
  closingDetailEn: string;
  closingActions: { labelTh: string; labelEn: string; href: string }[];
  landingDescriptionTh: string;
  landingDescriptionEn: string;
  landingHighlightsTh: string[];
  landingHighlightsEn: string[];
};

const SPORT_META: Record<string, SportMeta> = {
  badminton: {
    code: "badminton",
    name: "Badminton",
    nameTh: "แบดมินตัน",
    accent: "#FF4D6D",
    gradient: "from-rose-500/30 via-orange-500/20 to-amber-500/10",
    heroHeadlineTh: "ฮับของคนรักแบดในประเทศไทย",
    heroHeadlineEn: "Feather-focused hub for Thai shuttlers.",
    heroDescriptionTh:
      "ค้นหาคอร์ทควบคุมความชื้น เข้าร่วมลำดับ Sukhumvit และเก็บสถิติทุกแมตช์บนระบบเดียว",
    heroDescriptionEn:
      "Find climate-controlled courts, tap into Sukhumvit ladder groups, and track every rally with Supabase-backed stats.",
    closingTitleTh: "พร้อมขยายคอมมูนิตี้แบดไทยหรือยัง?",
    closingTitleEn: "Ready to grow Thailand’s badminton scene?",
    closingDetailTh:
      "เริ่มจาก badminton.racketthailand.com แล้วส่งคอร์ท กลุ่ม และการแข่งขันใหม่ ๆ ได้ทันที",
    closingDetailEn:
      "Start from badminton.racketthailand.com to share courts, groups, and ladder matches instantly.",
    closingActions: [
      {
        labelTh: "ส่งข้อมูลคอร์ท",
        labelEn: "Submit a court",
        href: "mailto:hello@racketthailand.com",
      },
      {
        labelTh: "ดูตารางลำดับ",
        labelEn: "View ladders",
        href: "/badminton#matches",
      },
    ],
    landingDescriptionTh:
      "รวมคอร์ท กลุ่ม และแรงก์สำหรับสายแบดทั้งกรุงเทพฯ และเชียงใหม่",
    landingDescriptionEn:
      "Club guides, drop-in schedules, and rankings for both Bangkok speedsters and Chiang Mai grinders.",
    landingHighlightsTh: ["ค้นหาคอร์ท", "ลำดับกลางคืน", "บทความเทคนิค"],
    landingHighlightsEn: ["Court finder", "Night ladders", "Pro tips"],
  },
  padel: {
    code: "padel",
    name: "Padel",
    nameTh: "พาเดล",
    accent: "#FF9F1C",
    gradient: "from-orange-500/30 via-amber-500/20 to-rose-500/10",
    heroHeadlineTh: "ติดตามเครือข่ายพาเดลที่เติบโตเร็วที่สุดในไทย",
    heroHeadlineEn: "Track Thailand’s fastest-growing padel network.",
    heroDescriptionTh:
      "รวมคอร์ทพรีเมียม ลีกสุดสัปดาห์ และคอนเทนต์ไฮไลต์ที่คัดแล้วสำหรับผู้เล่นคู่นี้",
    heroDescriptionEn:
      "Premium courts, membership clubs, and curated weekend socials designed for doubles fans.",
    closingTitleTh: "ช่วยให้พาเดลบูมทั่วประเทศ",
    closingTitleEn: "Help padel thrive across Thailand.",
    closingDetailTh:
      "นำทุกลีก งานอีเวนต์ และคอร์ทเข้าสู่ padel.racketthailand.com เพื่อให้ผู้เล่นเจอกันง่ายขึ้น",
    closingDetailEn:
      "Bring every league, mixer, and court into padel.racketthailand.com so players can find each other faster.",
    closingActions: [
      {
        labelTh: "จัดงานพาเดล",
        labelEn: "Host a padel event",
        href: "/padel#groups",
      },
      {
        labelTh: "ติดต่อพาร์ทเนอร์",
        labelEn: "Contact partnerships",
        href: "mailto:hello@racketthailand.com",
      },
    ],
    landingDescriptionTh:
      "ติดตามคอร์ทพรีเมียม ดับเบิลโซเชียล และคอนเทนต์คัดสรรของพาเดลไทย",
    landingDescriptionEn:
      "Track the fast-growing padel scene with premium venues, social doubles, and curated community drops.",
    landingHighlightsTh: ["รีวิวคอร์ท", "มีทอัปสุดสัปดาห์", "สปอนเซอร์อุปกรณ์"],
    landingHighlightsEn: ["Venue spotlights", "Weekend mixers", "Equipment partners"],
  },
  pickleball: {
    code: "pickleball",
    name: "Pickleball",
    nameTh: "พิคเคิลบอล",
    accent: "#2EC4B6",
    gradient: "from-emerald-400/30 via-teal-400/20 to-cyan-500/10",
    heroHeadlineTh: "ฐานข้อมูลพิคเคิลบอลที่เดินทางได้ทุกจังหวัด",
    heroHeadlineEn: "Travel-friendly pickleball finder.",
    heroDescriptionTh:
      "รวบรวมคอร์ทชั่วคราว กลุ่มนักท่องเที่ยวกีฬา และคอร์สคลินิกตั้งแต่ภูเก็ตถึงเชียงใหม่",
    heroDescriptionEn:
      "Locate pop-up courts, traveling crews, and clinics from Phuket to Chiang Mai.",
    closingTitleTh: "ให้ผู้เล่นพิคเคิลบอลเดินทางได้ง่ายขึ้น",
    closingTitleEn: "Keep pickleball explorers synced.",
    closingDetailTh:
      "แชร์คอร์ทใหม่หรือเข้าร่วมกลุ่มเดินทางผ่าน pickleball.racketthailand.com ในระบบเดียว",
    closingDetailEn:
      "Share travel courts or join nomad crews through pickleball.racketthailand.com with one login.",
    closingActions: [
      {
        labelTh: "แชร์คอร์ทท่องเที่ยว",
        labelEn: "Share a travel court",
        href: "mailto:hello@racketthailand.com",
      },
      {
        labelTh: "เข้ากลุ่มภูเก็ต",
        labelEn: "Join Phuket crews",
        href: "/pickleball#groups",
      },
    ],
    landingDescriptionTh:
      "เชื่อมผู้เล่นที่เดินทางไปทั่วไทย ค้นหาคอร์ทและจัดสกิลแมตช์อัตโนมัติ",
    landingDescriptionEn:
      "Connect with traveling players, reserve courts, and build beginner-to-pro ladders across Thailand.",
    landingHighlightsTh: ["จับคู่ฝีมือ", "แจ้งเวลาคอร์ท", "ปฏิทินคลินิก"],
    landingHighlightsEn: ["Skill-matched groups", "Court availability", "Clinic calendar"],
  },
  tennis: {
    code: "tennis",
    name: "Tennis",
    nameTh: "เทนนิส",
    accent: "#5C7CFA",
    gradient: "from-indigo-500/30 via-blue-500/20 to-sky-400/10",
    heroHeadlineTh: "ระบบเดียวที่ดูแลลีกเทนนิสทั้งประเทศ",
    heroHeadlineEn: "League-grade tennis infrastructure.",
    heroDescriptionTh:
      "จัดลีก ดูสถิติ และเชื่อมต่อผู้เล่นกับโค้ชในแพลตฟอร์มเดียว ใช้ข้อมูล Supabase เป็นศูนย์กลาง",
    heroDescriptionEn:
      "Run tournaments, monitor ladder stats, and match players to coaches in a single Supabase stack.",
    closingTitleTh: "ขับเคลื่อนเทนนิสไทยด้วยข้อมูลเดียวกัน",
    closingTitleEn: "Power Thai tennis with shared data.",
    closingDetailTh:
      "ให้สโมสร ลีก และเยาวชนใช้ระบบเดียวโดยไม่ต้องแยกบัญชีหลายที่",
    closingDetailEn:
      "Give clubs, leagues, and juniors a consistent system without fragmenting logins.",
    closingActions: [
      {
        labelTh: "เผยแพร่ลีก",
        labelEn: "Publish a league",
        href: "/tennis#matches",
      },
      {
        labelTh: "ติดต่อฝ่ายโค้ช",
        labelEn: "Reach coach support",
        href: "mailto:hello@racketthailand.com",
      },
    ],
    landingDescriptionTh:
      "จัดลีก ค้นหาโค้ช และดูคะแนนสดบนระบบเดียวสำหรับเทนนิสไทย",
    landingDescriptionEn:
      "Organize league seasons, scout coaches, and stay in sync with tournament-ready scoreboards.",
    landingHighlightsTh: ["ติดตามลีก", "ตลาดโค้ช", "สถิติแมตช์"],
    landingHighlightsEn: ["League tracking", "Coach marketplace", "Match analytics"],
  },
  tabletennis: {
    code: "tabletennis",
    name: "Table Tennis",
    nameTh: "ปิงปอง",
    accent: "#9B5DE5",
    gradient: "from-purple-500/30 via-fuchsia-400/20 to-pink-400/10",
    heroHeadlineTh: "พื้นที่ออนไลน์ของคนรักปิงปองไทย",
    heroHeadlineEn: "Spin-first experience for Thai pongers.",
    heroDescriptionTh:
      "อัปเดตคลับ โครงการเยาวชน และแมตช์ไฮไลต์จากพัทยาถึงภูเก็ต",
    heroDescriptionEn:
      "Highlight clubs, youth academies, reviews, and match archives dedicated to table tennis.",
    closingTitleTh: "ผลักดันศักยภาพนักปิงปองไทย",
    closingTitleEn: "Champion Thailand’s table tennis talent.",
    closingDetailTh:
      "สร้างพื้นที่ให้โค้ช เยาวชน และผู้เล่นสันทนาการแชร์ข้อมูลชุดเดียวกัน",
    closingDetailEn:
      "Give coaches, juniors, and weekend warriors a cohesive space dedicated to spin.",
    closingActions: [
      {
        labelTh: "ส่งข้อมูลอะคาเดมี",
        labelEn: "Submit a youth academy",
        href: "mailto:hello@racketthailand.com",
      },
      {
        labelTh: "ดูคลังแมตช์",
        labelEn: "Browse match archives",
        href: "/tabletennis#matches",
      },
    ],
    landingDescriptionTh:
      "คอมมูนิตี้ของคลับ เยาวชน และรีวิวปิงปองทั่วประเทศ",
    landingDescriptionEn:
      "Spin-focused hubs for clubs, youth academies, and rating-backed matches from Pattaya to Phuket.",
    landingHighlightsTh: ["รีวิวคลับ", "โครงการเยาวชน", "ชมไฮไลต์"],
    landingHighlightsEn: ["Club reviews", "Youth programs", "Match replays"],
  },
};

export type SportMetaCode = keyof typeof SPORT_META;

export const SUPPORTED_SPORTS = Object.keys(SPORT_META) as SportMetaCode[];

export function getSportMeta(code: string): SportMeta | undefined {
  return SPORT_META[code.toLowerCase()];
}

export const LANDING_SPORTS = Object.values(SPORT_META).map(
  ({
    code,
    name,
    nameTh,
    accent,
    landingDescriptionTh,
    landingDescriptionEn,
    landingHighlightsTh,
    landingHighlightsEn,
  }) => ({
    code,
    name,
    nameTh,
    color: accent,
    descriptionTh: landingDescriptionTh,
    descriptionEn: landingDescriptionEn,
    highlightsTh: landingHighlightsTh,
    highlightsEn: landingHighlightsEn,
  }),
);
