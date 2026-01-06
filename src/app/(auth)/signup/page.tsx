import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import {
  buildLocalizedPath,
  getTranslator,
  normalizeLocale,
} from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type SearchParams = {
  lang?: string;
};

type SearchParamInput = Promise<SearchParams> | undefined;

async function resolveSearchParams(
  searchParams?: SearchParamInput,
): Promise<SearchParams | undefined> {
  if (!searchParams) return undefined;
  return searchParams;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: SearchParamInput;
}) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const locale = normalizeLocale(resolvedParams?.lang);
  const t = await getTranslator(locale);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(buildLocalizedPath("/", locale));
  }
  const formCopy = {
    nameLabel: t("auth.nameLabel"),
    emailLabel: t("auth.emailLabel"),
    passwordLabel: t("auth.passwordLabel"),
    confirmPasswordLabel: t("auth.confirmPasswordLabel"),
    button: t("auth.signupButton"),
    agreeTerms: t("auth.agreeTerms"),
    verifyNotice: t("auth.verifyNotice"),
    passwordToggleShow: t("auth.passwordShow"),
    passwordToggleHide: t("auth.passwordHide"),
    passwordRequirements: t("auth.passwordRequirements"),
  };

  if (!t) {
    throw new Error("Translator unavailable");
  }

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.15),_transparent_60%)]" />

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-6 pb-20 pt-10 md:px-10">
        <section className="w-full rounded-[32px] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/50 backdrop-blur">
          <h1 className="text-3xl font-semibold text-white">
            {t("auth.signupTitle")}
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            {t("auth.signupSubtitle")}
          </p>
          <SignupForm locale={locale} copy={formCopy} />
          <p className="mt-4 text-sm text-slate-300">
            {t("auth.switchToLogin")}{" "}
            <Link
              href={buildLocalizedPath("/login", locale)}
              className="font-semibold text-slate-100"
            >
              {t("header.login")}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
