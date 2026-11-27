import { AdminFeedbackTable } from "@/components/admin/feedback-table";
import {
  AdminPortalShell,
  buildAdminPortalNav,
} from "@/components/admin/admin-portal-shell";
import { buildLocalizedPath, getTranslator, normalizeLocale } from "@/lib/i18n";
import { supabaseSelect } from "@/lib/supabaseRest";
import { requireAdminPageAccess } from "@/server/admin";

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
  court_id: string | null;
  group_id: string | null;
  court?: { id: string; name: string | null } | null;
  group?: { id: string; name: string | null } | null;
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
  await requireAdminPageAccess(locale);
  const navItems = buildAdminPortalNav(locale, t);

  const feedbackQuery = await supabaseSelect<FeedbackRow>("feedback", {
    select:
      "id,subject,message,type,status,priority,checked,created_at,reporter_id,court_id,group_id,reporter:profiles!feedback_reporter_id_fkey(display_name,username),court:courts!feedback_court_id_fkey(id,name),group:groups!feedback_group_id_fkey(id,name)",
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
      reporterId: row.reporter_id,
      listingType: row.court_id
        ? ("court" as const)
        : row.group_id
          ? ("group" as const)
          : null,
      listingId: row.court_id ?? row.group_id,
      listingName: row.court?.name ?? row.group?.name ?? null,
      listingHref: row.court_id
        ? buildLocalizedPath(`/courts/${row.court_id}`, locale)
        : row.group_id
          ? buildLocalizedPath(`/groups/${row.group_id}`, locale)
          : null,
    })) ?? [];

  const tableCopy = {
    headers: {
      subject: t("admin.feedbackTable.subject"),
      reporter: t("admin.feedbackTable.reporter"),
      submitted: t("admin.feedbackTable.submitted"),
      status: t("admin.feedbackTable.status"),
      actions: t("admin.feedbackTable.actions"),
    },
    sortBy: t("admin.feedbackTable.sortBy"),
    sortByDate: t("admin.feedbackTable.sortByDate"),
    newest: t("admin.feedbackTable.newest"),
    oldest: t("admin.feedbackTable.oldest"),
    sortByStatus: t("admin.feedbackTable.sortByStatus"),
    statusPending: t("admin.feedbackTable.statusPending"),
    statusInReview: t("admin.feedbackTable.statusInReview"),
    statusResolved: t("admin.feedbackTable.statusResolved"),
    statusDismissed: t("admin.feedbackTable.statusDismissed"),
    noSubject: t("admin.feedbackTable.noSubject"),
    noMessage: t("admin.feedbackTable.noMessage"),
    messageLabel: t("admin.feedbackTable.message"),
    typeLabel: t("admin.feedbackTable.type"),
    statusLabel: t("admin.feedbackTable.status"),
    priorityLabel: t("admin.feedbackTable.priority"),
    markRead: t("admin.feedbackTable.markRead"),
    markUnread: t("admin.feedbackTable.markUnread"),
    mark: t("admin.feedbackTable.mark"),
    checked: t("admin.feedbackTable.checked"),
    unchecked: t("admin.feedbackTable.unchecked"),
    changeStatus: t("admin.feedbackTable.changeStatus"),
    updating: t("admin.feedbackTable.updating"),
    empty: t("admin.feedbackTable.empty"),
    error: t("admin.feedbackTable.error"),
    listing: t("admin.feedbackTable.listing"),
    viewListing: t("admin.feedbackTable.viewListing"),
    assignToReporter: t("admin.feedbackTable.assignToReporter"),
    assignConfirmTitle: t("admin.feedbackTable.assignConfirmTitle"),
    assignConfirmMessage: t("admin.feedbackTable.assignConfirmMessage"),
    assignConfirm: t("admin.feedbackTable.assignConfirm"),
    cancel: t("admin.feedbackTable.cancel"),
    assignmentSuccess: t("admin.feedbackTable.assignmentSuccess"),
    assignmentError: t("admin.feedbackTable.assignmentError"),
    details: t("admin.feedbackTable.details"),
    hideDetails: t("admin.feedbackTable.hideDetails"),
  };

  return (
    <AdminPortalShell
      activePath="/admin/feedback"
      title={t("admin.feedbackTitle")}
      navItems={navItems}
      copy={{
        navigationLabel: t("admin.navigation"),
      }}
    >
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <AdminFeedbackTable rows={rows} copy={tableCopy} />
        </div>
      </section>
    </AdminPortalShell>
  );
}
