import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password | RacketThailand",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <main className="mx-auto flex max-w-lg flex-col gap-4 px-6 pb-20 pt-16 text-center md:px-8">
        <section className="rounded-[32px] border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <p className="text-xs font-semibold uppercase text-slate-400">
            RacketThailand
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter your email and we&rsquo;ll send a reset link. This also lets
            Google login users create a password for manual sign-in.
          </p>
          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </section>
      </main>
    </div>
  );
}
