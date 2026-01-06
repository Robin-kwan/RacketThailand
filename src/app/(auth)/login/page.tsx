import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
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

export default async function LoginPage({
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
    emailLabel: t("auth.emailLabel"),
    passwordLabel: t("auth.passwordLabel"),
    rememberMe: t("auth.rememberMe"),
    forgotPassword: t("auth.forgotPassword"),
    button: t("auth.loginButton"),
    agreeTerms: t("auth.agreeTerms"),
    emailNotVerified: t("auth.emailNotVerified"),
    passwordToggleShow: t("auth.passwordShow"),
    passwordToggleHide: t("auth.passwordHide"),
    googleButton: t("auth.googleButton"),
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.15),_transparent_60%)]" />

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-6 pb-20 pt-10 md:px-10">
        <section className="w-full rounded-[32px] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/50 backdrop-blur">
          <h1 className="text-3xl font-semibold text-white">
            {t("auth.loginTitle")}
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            {t("auth.loginSubtitle")}
          </p>
          <LoginForm locale={locale} copy={formCopy} />
          <p className="mt-4 text-sm text-slate-300">
            {t("auth.switchToSignup")}{" "}
            <Link
              href={buildLocalizedPath("/signup", locale)}
              className="font-semibold text-slate-100"
            >
              {t("header.signup")}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
