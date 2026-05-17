import type { Metadata } from "next";
import Link from "next/link";
import { BaseCard } from "@/components/base-card";
import { buildLocalizedPath, normalizeLocale } from "@/lib/i18n";
import {
  buildCanonicalUrl,
  buildLocaleAlternates,
  truncateMetaDescription,
} from "@/lib/seo";

type SearchParams = {
  lang?: string;
};

type SearchParamsInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamsInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

const LAST_UPDATED = {
  th: "18 พฤษภาคม 2026",
  en: "May 18, 2026",
} as const;

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}): Promise<Metadata> {
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);
  const title =
    locale === "th"
      ? "ข้อกำหนดและประกาศเรื่องเนื้อหา | RacketThailand"
      : "Terms & Content Notice | RacketThailand";
  const description = truncateMetaDescription(
    locale === "th"
      ? "ข้อกำหนดการใช้งานเว็บไซต์ RacketThailand รวมถึงนโยบายการแสดงรายการสนาม กลุ่มกีฬา สิทธิในเนื้อหา และการขอแก้ไขหรือลบข้อมูล"
      : "RacketThailand terms, directory notice, content ownership statement, and removal or correction request policy for courts, groups, and other listings.",
  );
  const canonicalPath = "/terms";
  const canonicalUrl = buildCanonicalUrl(canonicalPath, locale);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLocaleAlternates(canonicalPath),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function TermsPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolvedSearch = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedSearch?.lang);

  const copy =
    locale === "th"
      ? {
          eyebrow: "RacketThailand",
          title: "ข้อกำหนดและประกาศเรื่องเนื้อหา",
          intro:
            "RacketThailand เป็นเพียงไดเรกทอรีและคอมมูนิตี้สำหรับกีฬาประเภทแร็กเกตในประเทศไทย เรารวบรวมข้อมูลสนาม กลุ่ม นัดหาเพื่อนตี และเนื้อหาคอมมูนิตี้เพื่อช่วยให้ผู้เล่นค้นหาและติดต่อกันได้ง่ายขึ้น",
          updated: `อัปเดตล่าสุด ${LAST_UPDATED.th}`,
          contactLabel: "คำขอลบหรือแก้ไขข้อมูล",
          contactBody:
            "หากคุณเป็นเจ้าของสนาม เจ้าของกลุ่ม ผู้ถือสิทธิ หรือผู้แทนที่ได้รับมอบอำนาจ และไม่ต้องการให้ข้อมูลปรากฏบนเว็บไซต์ คุณสามารถขอให้เราลบหรือแก้ไขได้ที่",
          emailLabel: "อีเมลสำหรับคำขอ",
          sections: [
            {
              title: "1. บทบาทของเว็บไซต์",
              body: [
                "RacketThailand ทำหน้าที่เป็นแพลตฟอร์มไดเรกทอรีและชุมชนสำหรับกีฬาประเภทแร็กเกตเท่านั้น",
                "เราไม่ได้เป็นเจ้าของสนาม ผู้จัดกลุ่ม ผู้จัดกิจกรรม หรือคู่สัญญาในการให้บริการของบุคคลภายนอก เว้นแต่จะมีการระบุไว้ชัดเจนเป็นอย่างอื่น",
              ],
            },
            {
              title: "2. ความเป็นเจ้าของเนื้อหา",
              body: [
                "ชื่อสนาม ชื่อกลุ่ม โลโก้ รูปภาพ ข้อความ รายละเอียดการติดต่อ และเนื้อหาอื่น ๆ ที่เกี่ยวข้องกับบุคคลหรือธุรกิจภายนอก ยังคงเป็นทรัพย์สินหรืออยู่ภายใต้สิทธิของเจ้าของเดิม",
                "การแสดงรายการบน RacketThailand ไม่ได้หมายความว่าเว็บไซต์อ้างกรรมสิทธิ์ อ้างลิขสิทธิ์ หรืออ้างสิทธิแต่เพียงผู้เดียวเหนือเนื้อหานั้น",
              ],
            },
            {
              title: "3. แหล่งที่มาของข้อมูล",
              body: [
                "ข้อมูลบางส่วนอาจมาจากเจ้าของรายการ ผู้ดูแลระบบ ผู้ใช้ หรือแหล่งข้อมูลสาธารณะที่เกี่ยวข้องกับกีฬาประเภทแร็กเกต",
                "แม้เราจะพยายามดูแลให้ข้อมูลถูกต้องและเป็นปัจจุบัน แต่เราไม่รับประกันว่าข้อมูลทุกส่วนจะครบถ้วน ถูกต้อง หรืออัปเดตตลอดเวลา",
              ],
            },
            {
              title: "4. คำขอลบ แก้ไข หรือโต้แย้งสิทธิ",
              body: [
                "หากคุณไม่ต้องการให้มีการแสดงข้อมูลของคุณบนเว็บไซต์ หรือเห็นว่าข้อมูลดังกล่าวละเมิดสิทธิ สร้างความเข้าใจผิด หรือไม่ถูกต้อง คุณสามารถส่งคำขอลบหรือแก้ไขได้",
                "โปรดระบุชื่อสนามหรือกลุ่ม ลิงก์หน้าที่เกี่ยวข้อง รายละเอียดคำขอ และข้อมูลที่ยืนยันว่าคุณเป็นเจ้าของสิทธิหรือเป็นผู้มีอำนาจดำเนินการแทน",
                "เมื่อได้รับคำขอที่สมเหตุสมผล เราจะตรวจสอบและดำเนินการแก้ไข จำกัดการมองเห็น หรือถอดข้อมูลออกตามความเหมาะสม",
              ],
            },
            {
              title: "5. ไม่มีการรับรองหรือผูกพันเชิงพาณิชย์",
              body: [
                "การมีรายชื่อสนาม กลุ่ม หรือกิจกรรมบนเว็บไซต์ ไม่ได้หมายความว่า RacketThailand รับรอง รับประกัน สนับสนุน หรือเป็นพันธมิตรทางการค้ากับรายการนั้นโดยอัตโนมัติ",
                "ผู้ใช้ควรตรวจสอบรายละเอียด ราคา เวลาเปิดทำการ เงื่อนไขการเข้าร่วม และข้อมูลติดต่อกับเจ้าของรายการโดยตรงก่อนตัดสินใจ",
              ],
            },
            {
              title: "6. ลิงก์ภายนอกและเนื้อหาจากบุคคลที่สาม",
              body: [
                "เว็บไซต์อาจมีลิงก์ไปยังเว็บไซต์ โซเชียลมีเดีย แผนที่ หรือช่องทางติดต่อของบุคคลที่สาม",
                "RacketThailand ไม่ได้ควบคุมเนื้อหา นโยบาย หรือการให้บริการของเว็บไซต์หรือบริการภายนอกดังกล่าว",
              ],
            },
            {
              title: "7. สิทธิของเราในการดูแลแพลตฟอร์ม",
              body: [
                "เราขอสงวนสิทธิในการแก้ไข ปรับปรุง ซ่อน จำกัดการเข้าถึง หรือถอดรายการหรือเนื้อหาบางส่วนออกจากเว็บไซต์ เมื่อเห็นว่าจำเป็นต่อความถูกต้อง ความปลอดภัย คุณภาพแพลตฟอร์ม หรือการปฏิบัติตามกฎหมาย",
              ],
            },
          ],
          closing:
            "หากคุณต้องการให้เรารีวิวข้อมูลของสนาม กลุ่ม หรือเนื้อหาใด ๆ เป็นกรณีพิเศษ กรุณาติดต่อเราทางอีเมลด้านล่าง",
          backHome: "กลับหน้าแรก",
        }
      : {
          eyebrow: "RacketThailand",
          title: "Terms & Content Notice",
          intro:
            "RacketThailand is a directory and community platform for racket sports in Thailand. We list courts, groups, casual plays, and community content to help players discover places and connect more easily.",
          updated: `Last updated ${LAST_UPDATED.en}`,
          contactLabel: "Removal or correction requests",
          contactBody:
            "If you are a court owner, group owner, rights holder, or an authorized representative and you do not want certain content to appear on the website, you may ask us to remove or correct it at",
          emailLabel: "Request email",
          sections: [
            {
              title: "1. Our role",
              body: [
                "RacketThailand operates as a directory and community platform for racket sports.",
                "We are not the court operator, group organizer, event organizer, or contracting party for third-party services unless we clearly say otherwise.",
              ],
            },
            {
              title: "2. Ownership of content",
              body: [
                "Court names, group names, logos, photos, descriptions, contact details, and other related third-party materials remain the property of their original owners or rights holders.",
                "Displaying a listing on RacketThailand does not mean the website claims ownership, copyright, or exclusive rights over that content.",
              ],
            },
            {
              title: "3. Sources of information",
              body: [
                "Some information may come from listing owners, administrators, users, or public sources related to racket sports.",
                "While we try to keep listings accurate and current, we do not guarantee that every item of information is complete, accurate, or always up to date.",
              ],
            },
            {
              title: "4. Removal, correction, and rights disputes",
              body: [
                "If you do not want your content listed on the website, or if you believe content is inaccurate, misleading, or infringes your rights, you may send a removal or correction request.",
                "Please include the court or group name, the page link, the requested action, and enough information to show that you are the owner, rights holder, or an authorized representative.",
                "Once we receive a reasonable request, we may review it and update, limit, or remove the content as appropriate.",
              ],
            },
            {
              title: "5. No endorsement or commercial affiliation",
              body: [
                "A listing on RacketThailand does not automatically mean that we endorse, guarantee, sponsor, or commercially partner with that court, group, or activity.",
                "Users should confirm pricing, opening hours, participation rules, and contact details directly with the relevant owner or organizer before relying on the listing.",
              ],
            },
            {
              title: "6. External links and third-party services",
              body: [
                "The website may include links to third-party websites, maps, social media pages, or contact channels.",
                "RacketThailand does not control the content, policies, or services of those third-party destinations.",
              ],
            },
            {
              title: "7. Our moderation rights",
              body: [
                "We reserve the right to edit, update, hide, restrict, or remove listings or content when reasonably necessary for accuracy, safety, platform quality, or legal compliance.",
              ],
            },
          ],
          closing:
            "If you want us to review a specific court, group, or content issue, please contact us by email below.",
          backHome: "Back to home",
        };

  return (
    <div className="rt-page">
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-20 pt-10 text-[var(--foreground)] md:px-10">
        <BaseCard
          as="section"
          className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgb(var(--foreground-rgb)/0.08)]"
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--foreground-rgb)/0.52)]">
              {copy.eyebrow}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              {copy.title}
            </h1>
            <p className="text-sm text-[rgb(var(--foreground-rgb)/0.56)]">
              {copy.updated}
            </p>
            <p className="max-w-3xl text-base leading-7 text-[rgb(var(--foreground-rgb)/0.76)]">
              {copy.intro}
            </p>
          </div>

          <div className="rounded-3xl border border-[rgb(var(--rt-primary-rgb)/0.18)] bg-[rgb(var(--rt-primary-rgb)/0.06)] p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {copy.contactLabel}
            </p>
            <p className="mt-2 text-sm leading-7 text-[rgb(var(--foreground-rgb)/0.74)]">
              {copy.contactBody}{" "}
              <a
                href="mailto:racketthailand@gmail.com"
                className="font-semibold text-[var(--rt-primary)] underline underline-offset-4"
              >
                racketthailand@gmail.com
              </a>
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[rgb(var(--foreground-rgb)/0.5)]">
              {copy.emailLabel}
            </p>
          </div>

          <div className="space-y-4">
            {copy.sections.map((section) => (
              <section
                key={section.title}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
              >
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-[rgb(var(--foreground-rgb)/0.76)]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-6">
            <p className="text-sm leading-7 text-[rgb(var(--foreground-rgb)/0.74)]">
              {copy.closing}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="mailto:racketthailand@gmail.com"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                racketthailand@gmail.com
              </a>
              <Link
                href={buildLocalizedPath("/", locale)}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
              >
                {copy.backHome}
              </Link>
            </div>
          </div>
        </BaseCard>
      </main>
    </div>
  );
}
