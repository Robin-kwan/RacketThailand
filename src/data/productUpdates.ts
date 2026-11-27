import type { Locale } from "@/lib/i18n";

export type ProductUpdateKind = "new" | "improved" | "fixed";

type LocalizedText = Record<Locale, string>;

export type ProductUpdate = {
  version: string;
  releasedAt: string;
  title: LocalizedText;
  summary: LocalizedText;
  items: Array<{
    kind: ProductUpdateKind;
    text: LocalizedText;
  }>;
};

// Use date-based versions so releases remain easy to identify without
// maintaining a separate semantic-version sequence.
export const PRODUCT_UPDATES: ProductUpdate[] = [
  {
    version: "2026.09.07",
    releasedAt: "2026-09-07T12:00:00+07:00",
    title: {
      th: "รวมการนัดเล่นไว้ในกลุ่ม",
      en: "Play sessions now live within groups",
    },
    summary: {
      th: "รวมการนัดเล่นไว้กับกลุ่มเพื่อให้ค้นหาและจัดการได้จากที่เดียว ส่วนหน้าหาเพื่อนเล่นยังใช้ค้นหาผู้เล่นที่เปิดให้ค้นหาได้ตามเดิม",
      en: "Play sessions are now organized through groups so they can be discovered and managed in one place. Player Finder continues to show available players.",
    },
    items: [
      {
        kind: "improved",
        text: {
          th: "สร้างกลุ่มเพียงครั้งเดียว แล้วเพิ่มรอบเล่นใหม่ให้กลุ่มเดิมได้ทุกครั้ง ช่วยลดการสร้างกลุ่มซ้ำ",
          en: "Create a group once, then keep adding new sessions to it instead of creating duplicate groups.",
        },
      },
      {
        kind: "improved",
        text: {
          th: "หน้าหาเพื่อนเล่นจะแสดงเฉพาะผู้เล่นที่เปิดให้ค้นหา โดยไม่มีหน้านัดเล่นแยกอีกต่อไป",
          en: "Player Finder now focuses only on available players, without a separate Play Invitations view.",
        },
      },
      {
        kind: "new",
        text: {
          th: "หากดูแลหลายกลุ่ม ระบบจะแสดงหน้าสำหรับเลือกกลุ่มก่อนเพิ่มรอบเล่น",
          en: "Organizers with multiple groups can now choose which group should receive the new session.",
        },
      },
    ],
  },
];
