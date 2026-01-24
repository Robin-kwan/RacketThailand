import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminFeedbackTable } from "@/components/admin/feedback-table";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseSelect } from "@/lib/supabaseRest";

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

type FeedbackRow = {
  id: string;
  subject: string | null;
  message: string | null;
  type: string | null;
  status: string | null;
  priority: string | null;
  checked: boolean | null;
  created_at: string;
  reporter_id: string | null;
  reporter?: {
    display_name: string | null;
    username: string | null;
  } | null;
};

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolved?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(buildLocalizedPath("/login", locale));
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("status,display_name")
    .eq("id", user.id)
    .single();
  if (profile?.status !== "admin") {
    redirect(buildLocalizedPath("/", locale));
  }

  const feedbackQuery = await supabaseSelect<FeedbackRow>("feedback", {
    select:
      "id,subject,message,type,status,priority,checked,created_at,reporter_id,reporter:profiles!feedback_reporter_id_fkey(display_name,username)",
    order: "created_at.desc",
    limit: "50",
  });

  const rows =
    feedbackQuery.data?.map((row) => ({
      id: row.id,
      subject: row.subject,
      message: row.message,
      type: row.type,
      status: row.status,
      priority: row.priority,
      checked: Boolean(row.checked),
      createdAt: row.created_at,
      reporterName:
        row.reporter?.display_name ??
        row.reporter?.username ??
        row.reporter_id?.slice(0, 6) ??
        t("admin.feedbackTable.anonymous"),
      reporterEmail: null,
    })) ?? [];

  const tableCopy = {
    headers: {
      subject: t("admin.feedbackTable.subject"),
      reporter: t("admin.feedbackTable.reporter"),
      submitted: t("admin.feedbackTable.submitted"),
      actions: t("admin.feedbackTable.actions"),
    },
    noSubject: t("admin.feedbackTable.noSubject"),
    noMessage: t("admin.feedbackTable.noMessage"),
    typeLabel: t("admin.feedbackTable.type"),
    statusLabel: t("admin.feedbackTable.status"),
    priorityLabel: t("admin.feedbackTable.priority"),
    markRead: t("admin.feedbackTable.markRead"),
    markUnread: t("admin.feedbackTable.markUnread"),
    checked: t("admin.feedbackTable.checked"),
    unchecked: t("admin.feedbackTable.unchecked"),
    empty: t("admin.feedbackTable.empty"),
    error: t("admin.feedbackTable.error"),
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex w-full flex-col gap-8 px-6 pb-20 pt-10 md:px-10">
        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 backdrop-blur">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Admin · Feedback
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            {t("admin.feedbackTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("admin.feedbackSubtitle")}
          </p>
          <div className="mt-6">
            <AdminFeedbackTable rows={rows} copy={tableCopy} />
          </div>
        </section>
        <section className="text-sm text-slate-500">
          <Link
            href={buildLocalizedPath("/admin", locale)}
            className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:border-slate-500"
          >
            {t("admin.backToPanel")}
          </Link>
        </section>
      </main>
    </div>
  );
}
